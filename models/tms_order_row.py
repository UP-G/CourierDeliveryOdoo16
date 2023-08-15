from odoo import api, fields, models, _
from odoo.tools import pytz
from datetime import datetime

class TmsOrderRow(models.Model):
    _name = "tms.order.row"
    _description = 'Route Row'

    route_point_id = fields.Many2one('tms.route.point', index=True, string='route_point_id')
    order_id = fields.Many2one('tms.order', string='order_id')
    client_name = fields.Char(string='Client name') #Имя клиента
    arrival_date = fields.Datetime(string='arrival_time')
    impl_num = fields.Char(string='impl_num') # Номер заказа
    comment = fields.Char(string='Comment', default='phone;address')
    returned_client = fields.Datetime(string='is_returned_client')
    returned_store = fields.Datetime(string='is_returned_store')
    delivered = fields.Datetime(string='delivered')# Время доставкии
    complaint = fields.Datetime(string='complaint')
    note = fields.Char(string='note for order row')# Заметки
    selected = fields.Boolean(string='selected')#Поле выбрать
    order_row_type = fields.Selection([('return', 'Return'), ('delivery', ' Delivery')],
                                      string='Type of row')#Тип точки
    comment_driver = fields.Text(string='Comment from driver') #Коментарий водителя
    cancel_delivery = fields.Datetime(string='Date cancel of delivery') #Дата отмены от выполнения точки

    partner_key = fields.Many2one('res.partner', string='counterparty')
    cancellation_ids = fields.Many2many('tms.order.cancellation') # Теги причины отмены
    driver_browser_id = fields.Many2many('tms.driver.browser') #Uid уникальных пользователей

    type_warning = fields.Selection([('delivered_on_time', 'Delivered on time'),
                                     ('not_delivered_on_time', 'Not delivered on time'),
                                     ('no_end_date_order', 'There is no end date for the route'),
                                     ('no_warning', 'No warning')],
                                    string='Warning', compute='_compute_warning_for_row')

    @api.depends('delivered')
    def _compute_warning_for_row(self):
        now = datetime.now()
        for record in self:
            if record.order_id.interval_to:
                if (record.delivered and record.order_id.interval_to >= record.delivered) or (record.returned_client and record.order_id.interval_to >= record.returned_client) or (record.cancel_delivery and record.order_id.interval_to >= record.cancel_delivery):
                    record.type_warning = 'delivered_on_time'
                elif (record.delivered and record.order_id.interval_to < record.delivered) or (record.returned_client and record.order_id.interval_to < record.returned_client) or (record.cancel_delivery and record.order_id.interval_to < record.cancel_delivery) or (record.order_id.interval_to < now and not record.delivered and not record.returned_client):
                    record.type_warning = 'not_delivered_on_time'
                else:
                    record.type_warning = 'no_warning'
            else:
                record.type_warning = 'no_end_date_order'

    def show_tms_buttons(self):

        return {
            'name': _('TmsOrderButtons'),
            'type': 'ir.actions.client',
            'tag': 'tms_deliver_mode',
            'target': 'main',
            'context': self.read()[0],
        }

    @api.model
    def getPoint(self, pointId):
        points = self.browse(int(pointId))

        return {'id': points.id,
                'arrival_date': points.arrival_date,
                'returned_client': points.returned_client,
                'returned_store': points.returned_store,
                'delivered': points.delivered,
                'complaint': points.complaint,
                'phone': points.route_point_id.res_partner_id.phone,
                'impl_num': points.impl_num,
                }

    @api.model
    def saveInDB(self, dataTms): #Отрефакторить
        for dataAction in dataTms:
            if dataAction['action'] == 'arrival':
                record = self.env['tms.order.row'].search([('id', '=', dataAction['point_id'])], limit=1)
                record.arrival_date = dataAction['tms_date']
            elif dataAction['action'] == 'returned_client':
                record = self.env['tms.order.row'].search([('id', '=', dataAction['point_id'])], limit=1)
                record.returned_client = dataAction['tms_date']
            elif dataAction['action'] == 'delivered':
                record = self.env['tms.order.row'].search([('id', '=', dataAction['point_id'])], limit=1)
                record.delivered = dataAction['tms_date']
            elif dataAction['action'] == 'complaint':
                pass
            elif dataAction['action'] == 'arrival_loading':
                record = self.env['tms.order'].search([('id', '=', dataAction['route_id'])], limit=1)
                record.arrived_for_loading = dataAction['tms_date']
            elif dataAction['action'] == 'departed':
                record = self.env['tms.order'].search([('id', '=', dataAction['route_id'])], limit=1)
                record.departed_on_route = dataAction['tms_date']
            elif dataAction['action'] == 'finished':
                record = self.env['tms.order'].search([('id', '=', dataAction['route_id'])], limit=1)
                record.finished_the_route = dataAction['tms_date']
            elif dataAction['action'] == 'returned_store':# Вернулся на склад
                record = self.env['tms.order'].search([('id', '=', dataAction['route_id'])], limit=1)
                record.returned_to_the_store = dataAction['tms_date'] # Проставление даты для маршрута
                record = self.env['tms.order.row'].search([('route_point_id', '=', dataAction['route_id'])])
                record.update({
                    "returned_store": dataAction['tms_date'] # Проставление даты для точки
                })
            else:
                raise Exception()
        return 'Success'

    @api.model
    def saveDatesTmsOrderRow(self, dataTmsOrderRow, user_id, browse_id):
        for dataAction in dataTmsOrderRow:
            record = self.env['tms.order.row'].search([('id', '=', dataAction['point_id'])], limit=1)
            #Вынести в метод
            if browse_id:
                record.update({
                    'driver_browser_id': [(4, browse_id)],
                })
            if not record.order_id.departed_on_route: #Если дата начала маршрута пустая, то при выполненном заказе проставляем её.
                record.order_id.departed_on_route = dataAction['tms_date']
            if not record.order_id.driver_id: #Если не назначен водитель, то заполняем его
                record.order_id.driver_id = user_id

            if dataAction['action'] == 'arrival':
                record.arrival_date = dataAction['tms_date']
            elif dataAction['action'] == 'returned_client':
                record.returned_client = dataAction['tms_date']
            elif dataAction['action'] == 'delivered':
                record.delivered = dataAction['tms_date']
            elif dataAction['action'] == 'complaint':
                pass
            elif dataAction['action'] == 'cancelOrderRow': #Отмена точки маршрута
                record.update({
                    'cancel_delivery': dataAction['tms_date'],
                    'cancellation_ids': [(6, 0, [dataAction['tagCanceledId']])],
                    'comment_driver': dataAction['driverComment'],
                })

            if 'switch_status_row' in dataAction:
                vals = {
                    'delivered': False,
                    'returned_client': False,
                    'cancel_delivery': False
                }
                if dataAction['action'] == 'clear_date_row':
                    for key, value in vals.items():
                        if key in record:
                            if value != record[key]:
                                record.order_id.message_post(body=record.impl_num + ' сброс старых данных: ' + key + ' ' + format(record[key]) + 'UTC+0')
                    record.update(vals)
        return 'Success'
    
    @api.model
    def getRoutesPoints(self, orderId):
        points = self.search([('order_id.id', '=', orderId)])
        for point in points:
            print(point.route_point_id.res_partner_id.name)
            print(point.route_point_id.res_partner_id.company_name)
        return [
            {'id': point.id,
             'company_name': (point.route_point_id.res_partner_id.company_name or point.route_point_id.res_partner_id.name),
             'street': point.comment.split(';')[1],
             'order_num': point.order_id.order_num,
             'arrival_date': point.arrival_date,
             'impl_num': point.impl_num,
             'note': point.route_point_id.res_partner_id.comment,
             'phone': point.comment.split(';')[0],
             'returned_client': point.returned_client,
             'returned_store': point.returned_store,
             'delivered': point.delivered, #Время доставки заказа
             'complaint': point.complaint,
             }
            for point in points
        ]
        # return [
        #     {'id': point.id,
        #      'company_name': (point.route_point_id.res_partner_id.company_name or point.route_point_id.res_partner_id.name),
        #      'street': point.route_point_id.res_partner_id.street,
        #      'order_num': point.order_id.order_num,
        #      'arrival_date': point.arrival_date,
        #      'impl_num': point.impl_num,
        #      'note': point.route_point_id.res_partner_id.comment,
        #      'phone': point.route_point_id.res_partner_id.phone,
        #      'returned_client': point.returned_client,
        #      'returned_store': point.returned_store,
        #      'delivered': point.delivered,
        #      'complaint': point.complaint
        #      }
        #     for point in points
        # ]

    # @api.onchange("route_order_id.route_id.tmz")
    # def calculateTimeByTimezoneRoute(self):
    #     for record in self:
    #         tz = self.route_order_id.route_id.tmz
    #         record.arrival_date = pytz.utc.localize(self.arrival_date).astimezone(tz)

    def name_get(self):
        return [(record.id, '{order_num}'.format(order_num=record.order_id.order_num)) for record in self]
    
    def _get_action_interface_order_row(self):
        return {
        'returned_client': {
            'model': 'tms.order.row',
            'field': 'returned_client',
            'id_field': 'id'
        },
        'delivered': {
            'model': 'tms.order.row',
            'field': 'delivered',
            'id_field': 'id'
        },
    }

