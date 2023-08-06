from odoo import fields, models, tools, api
import logging
from datetime import datetime, timedelta
import json

_logger = logging.getLogger(__name__)


class TmsDeliveryReport(models.Model):
    """ Tms Delivery Report """

    _name = "tms.delivery.report"
    _auto = False
    _description = "Tms Delivery Report"
    _rec_name = 'id'

    driver_name = fields.Char('Driver name')  # ФИО водителя
    carrier_name = fields.Char('Company name')  # Название перевозчика
    client_name = fields.Char('Client name')  # Название клиента
    route = fields.Char('Route')  # Маршрут
    stock = fields.Char('Stock')  # Склад
    order_num = fields.Char('Order number')  # Номер ЗН
    impl_num = fields.Char('Implemention number')  # Номер реализации
    order_row_type = fields.Char(string='Type of row')  # Тип заказа
    # cancel_type = fields.Char('Cancel type') #Причина отмены заказа(если есть)

    order_create_date = fields.Datetime('Order create date')  # Дата формирования ЗН
    order_completed_date = fields.Datetime('Order completed date')  # Дата выполнения заказа
    start_route_date = fields.Datetime('Start route date')  # Дата начала маршрута
    finish_route_date = fields.Datetime('Finish route date')  # Дата конца маршрута
    returned_to_store = fields.Datetime('Returned to store date')  # Дата возвращения на склад
    # interval_from_date = fields.Datetime('Interval from date')  # Интервал с
    # interval_to_date = fields.Datetime('Interval to date')  # Интервал по

    order_row_count = fields.Float(string='Order row count')  # Кол-во всех заказов от клиентов
    delivered_count = fields.Float(string='Delivered count')  # Кол-во выполненных доставок
    returned_count = fields.Float(string='Returned count')  # Кол-во выполненных возвратов
    not_delivered_count = fields.Float(string='Not delivered count')  # Кол-во невыполненных доставок
    not_returned_count = fields.Float(string='Not returned count')  # Кол-во невыполненных возвратов
    completed_on_time_count = fields.Float(string='Completed on time count')  # Кол-во выполненных в пределах интервала
    not_completed_on_time_count = fields.Float(
        string='Not Completed on time count')  # Кол-во невыполненных в пределах интервала
    not_returned_to_store_count = fields.Float(
        string='Not returned to store count')  # Кол-во невернувшихся на склад в течение дня после конца маршрута

    # not_delivered_per = fields.Float(string='Not delivered per')  # Процент невыполненных доставок
    not_returned_per = fields.Float(string='Not returned per')  # Процент невыполненных возвратов
    not_delivered_on_time_per = fields.Float(string='Not delivered on time per')  # Процент невыполненных вовремя заказов

    not_delivered_per = fields.Float(
        string='Percentage of Not Completed Orders',
        compute='_compute_percentage_not_delivered',
        store=True,
        readonly=True
    )

    def _select(self):
        return """
            SELECT
                max(implementions.id) as id,
                carrier_driver.name as driver_name,
                carrier.name as carrier_name,
                'Клиент' as client_name,
                route.name as route,
                stock.name as stock,
                order_num as order_num,
                impl_num as impl_num,
                order_row_type as order_row_type,
                
                tms_order.create_date as order_create_date,
                COALESCE(returned_client, delivered) as order_completed_date,
                interval_from as start_route_date,
                interval_to as finish_route_date,
                returned_to_the_store as returned_to_store,
                finished_the_route as interval_from_date,
                
                sum(1) as order_row_count,
                sum(CASE WHEN delivered IS NOT NULL and order_row_type = 'delivery' THEN 1 ELSE 0 END) as delivered_count,
                sum(CASE WHEN returned_client IS NOT NULL and order_row_type = 'return' THEN 1 ELSE 0 END) as returned_count,
                sum(CASE WHEN delivered IS NULL and order_row_type = 'delivery' THEN 1 ELSE 0 END) as not_delivered_count,
                sum(CASE WHEN returned_client IS NULL and order_row_type = 'return' THEN 1 ELSE 0 END) as not_returned_count,
                sum(CASE
					WHEN delivered IS NOT NULL
					AND delivered <= interval_to THEN 1
					ELSE 0
				END) as completed_on_time_count,
                sum(CASE
					WHEN delivered IS NOT NULL
						AND delivered > interval_to THEN 1
					ELSE 0
				END) as not_completed_on_time_count,
                sum(CASE WHEN returned_to_the_store IS NULL and finished_the_route IS NOT NULL THEN 1 ELSE 0 END)  as not_returned_to_store_count,
                
                (sum(CASE WHEN delivered IS NULL and order_row_type = 'delivery' THEN 1 ELSE 0 END) * 100.0) / sum(1) as not_delivered_per,
    			(sum(CASE WHEN returned_client IS NULL and order_row_type = 'return' THEN 1 ELSE 0 END) * 100.0) / sum(1) as not_returned_per,
                0 as not_delivered_on_time_per    
        """

    def _from(self):
        return """
            FROM (SELECT
                implementions.id,
                implementions.impl_num,
                implementions.returned_store,
                implementions.returned_client,
                implementions.delivered,
                implementions.order_id,
				implementions.order_row_type	   
                FROM tms_order_row AS implementions) AS implementions
        """

    def _join(self):
        return """
            LEFT JOIN tms_order as tms_order ON tms_order.id = implementions.order_id
            LEFT JOIN tms_route as route ON route.id = tms_order.route_id
            LEFT JOIN res_partner as stock ON stock.id = route.stock_id
            LEFT JOIN tms_carrier as carrier ON tms_order.carrier_id = carrier.id
            LEFT JOIN tms_carrier_driver as carrier_driver ON tms_order.carrier_driver_id = carrier_driver.id
        """

    def _where(self):
        return ''

    def _group(self):
        return """
            GROUP BY driver_name, carrier_name, client_name, stock.name, route.name, order_num, order_row_type, impl_num, tms_order.create_date,
			returned_client, delivered, interval_from, interval_to, returned_to_the_store, finished_the_route
        """

    def init(self):
        tools.drop_view_if_exists(self._cr, self._table)
        self._cr.execute("""
            CREATE OR REPLACE VIEW %s AS (
                %s
                %s
                %s
                %s
                %s
            )
        """ % (self._table, self._select(), self._from(), self._join(), self._where(), self._group())
                         )

    @api.depends('delivered_count', 'not_delivered_count')
    def _compute_percentage_not_delivered(self):
        for record in self:
            if record.not_delivered_count != 0:
                record.percentage_not_completed = (record.not_delivered_count / (record.not_delivered_count + record.delivered_count))
            else:
                record.percentage_not_completed = 0.0
