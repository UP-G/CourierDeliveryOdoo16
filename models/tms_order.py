from odoo import api, fields, models, _

from datetime import date, datetime, timedelta
import pytz
#self.env['tms.delivery'].add_orders_from_delivery()
class TmsOrder(models.Model):
    _name = "tms.order"
    _description = 'Route order'

    driver_id = fields.Many2one('res.users', index=True, string='driver_id', compute='_compute_driver_id', store=True)
    route_id = fields.Many2one('tms.route', index=True, string='route_id')
    date_create_1c = fields.Datetime(string='Date create from 1C')
    arrived_for_loading = fields.Datetime(string='arrived_for_loading')
    departed_on_route = fields.Datetime(string='departed_on_route')
    finished_the_route = fields.Datetime(string='finished_the_route')
    returned_to_the_store = fields.Datetime(string='returned_to_the_store')
    notes = fields.Char(string='notes for order')
    interval_from = fields.Datetime(string='interval from')
    interval_to = fields.Datetime(string='interval to')
    order_num = fields.Char(string='Order Number', required=True, index=True)
    order_date = fields.Char(string='Order Date')
    carrier_id = fields.Many2one('tms.carrier', index=True, string='Carrier ids')
    carrier_driver_id = fields.Many2one('tms.carrier.driver', string='Carrier driver id')
    order_row_ids = fields.One2many('tms.order.row', 'order_id', string='implimentions of order') #ondelete='cascade'

    _sql_constraints = [
        ('unique_order_num', 'UNIQUE (order_num)', 'An Order Number must be unique!'),
    ]

    @api.depends('carrier_driver_id.user_id')
    def _compute_driver_id(self):
        for order in self:
            if order.carrier_driver_id and order.carrier_driver_id.user_id:
                order.driver_id = order.carrier_driver_id.user_id
            else:
                order.driver_id = False

    def getRows(self):
        return {
            'name': _('TmsTreePython'),
            'type': 'ir.actions.act_window',
            'res_model': 'tms.order.row',
            'view_mode': 'tree',
            'domain': [('order_id', '=', self.read()[0]['id'])],
        }

    @api.model
    def getRoutesForDriver(self, user_id):
        records = self.search([('driver_id', '=', user_id)])
        return [
                    {
                        'id': record.id,
                        'name': record.order_num,
                        'start_time': record.route_id.start_time,
                        'end_time': record.route_id.end_time,
                        'finished_the_route': record.finished_the_route,
                        'driver_id': record.driver_id.id if record.driver_id else '',
                        'driver_name': record.driver_id.name if record.driver_id else '',
                    }  for record in records
        ]

    @api.model
    def getRoutesAndPoints(self, user_id, tz_user=None):
        if not user_id:
            return #Если нет user_id ничего не возращять
        
        today = date.today()
        today_start = datetime.combine(today, datetime.min.time())
        carrier_driver_user = self.env['tms.carrier.driver'].search([('user_id', '=', user_id)])
        company_user = self.env['tms.carrier.route'].search([('driver_id', '=', carrier_driver_user.id)])
        carrier_ids = [r['carrier_id']['id'] for r in company_user]

        records = self.env['tms.order'].search([('create_date', '>=',today_start - timedelta(days=10)),
                        '|',('driver_id','=',user_id),
                            '&',('driver_id', '=', None),
                                ('carrier_id.id', 'in', carrier_ids), #Запрос на взятие маршрутов, у которых возрат скалада проставлен и дата сегодняшня или нет даты возрата в склад
         		"|", ('returned_to_the_store', '>=', today_start),
         		('returned_to_the_store', '=', None)])
        # records = self.search([('create_date', '>=',today_start - timedelta(days=10)),
        #                 '|',('driver_id','=',user_id),
        #                     '&',('driver_id', '=', None),
        #                         ('route_id.stock_id.user_ids.id', '=', user_id), #Запрос на взятие маршрутов, у которых возрат скалада проставлен и дата сегодняшня или нет даты возрата в склад
        #  		"|", ('returned_to_the_store', '>=', today_start),
        #  		('returned_to_the_store', '=', None)])
        
        if tz_user:
            current_timezone = pytz.timezone(tz_user)
        else:
            current_timezone = pytz.timezone('Europe/Moscow')

        result = []

        for record in records:
            points = self.env['tms.order.row'].search(['&', ('order_id.id', '=', record.id),
                                                       ('selected', '=', True)])

            record_points = [
                {'id': point.id,
                 'company_name': (point.route_point_id.res_partner_id.company_name or point.route_point_id.res_partner_id.name),
                 'street': point.comment.split(';')[1],
                 'order_num': point.order_id.order_num,
                 'arrival_date': point.arrival_date,
                 'impl_num': point.impl_num,
                 'note': point.note,
                 'phone': point.comment.split(';')[0],
                 'returned_client': point.returned_client.astimezone(current_timezone) if point.returned_client else False,
                 'returned_store': point.returned_store,
                 'delivered': point.delivered.astimezone(current_timezone) if point.delivered else False,
                 'complaint': point.complaint,
                 'order_row_type': point.order_row_type if point.order_row_type else ('return' if 'Возврат' in point.impl_num else False),
                 'cancel_delivery': point.cancel_delivery.astimezone(current_timezone) if point.cancel_delivery else False, #Время отмены заказа
                 'client_name': point.client_name,
                 }
                for point in points
            ]

            record_routes = {
                'id': record.id,
                'name': record.order_num + ", " + record.route_id.name if record.route_id.name else record.order_num,
                'start_time': record.route_id.start_time.astimezone(current_timezone) if record.route_id.start_time else False,
                'end_time': record.route_id.end_time.astimezone(current_timezone) if record.route_id.end_time else False,
                'arrived_for_loading': record.arrived_for_loading,
                'departed_on_route': record.departed_on_route,
                'returned_to_the_store': record.returned_to_the_store,
                'finished_the_route': record.finished_the_route,
                'driver_id': record.driver_id.id if record.driver_id else '',
                'driver_name': record.driver_id.name if record.driver_id else '',
                'points': record_points,
            }

            result.append(record_routes)

        return result
    
    @api.model
    def saveDatesTmsOrder(self, saveDatesTmsOrder, user_id):
        for dataAction in saveDatesTmsOrder:
            if dataAction['action'] == 'arrival_loading':
                record = self.env['tms.order'].search([('id', '=', dataAction['route_id'])], limit=1)
                record.arrived_for_loading = dataAction['tms_date']
            elif dataAction['action'] == 'departed':
                record = self.env['tms.order'].search([('id', '=', dataAction['route_id'])], limit=1)
                record.departed_on_route = dataAction['tms_date']
                if not record.driver_id:
                    record.driver_id = user_id
            elif dataAction['action'] == 'finished':
                record = self.env['tms.order'].search([('id', '=', dataAction['route_id'])], limit=1)
                record.finished_the_route = dataAction['tms_date']
            elif dataAction['action'] == 'returned_store':
                record = self.env['tms.order'].search([('id', '=', dataAction['route_id'])], limit=1)
                record.returned_to_the_store = dataAction['tms_date']
                record = self.env['tms.order.row'].search([('route_point_id', '=', dataAction['route_id'])])
                record.update({
                    "returned_store": dataAction['tms_date'] # Проставление даты для точки
                })
            else:
                raise Exception()
        return 'Success'

    def name_get(self):
        return [(record.id, '{num}, {number}, {date} ({route})'.format(num=record.order_num, route=record.route_id.name, number=record.order_num, date=record.order_date)) for record in self]

    def unlink(self):
        self.order_row_ids.unlink()
        result = super(TmsOrder, self).unlink()    

class TMSAttendance(models.Model):
    _inherit = "hr.attendance"

    @api.model
    def getDriverAttendance(self, driver_ids):
        return [ {'id': r.id, 'employee_id': r.employee_id.id, 'check_id': r.check_in} for r in self.search([('employee_id','in',driver_ids),('check_out','=',False)]) ]
