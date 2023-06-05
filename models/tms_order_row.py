from odoo import api, fields, models, _
from odoo.tools import pytz
import datetime


class TmsOrderRow(models.Model):
    _name = "tms.order.row"
    _description = 'Route Row'

    route_point_id = fields.Many2one('tms.route.point', required=True, ondelete='restrict',
                                     auto_join=True, index=True, string='route_point_id')
    order_id = fields.Many2one('tms.order', required=True, ondelete='restrict',
                                     auto_join=True, index=True, string='order_id')

    order_type = fields.Char(string='order_type')

    arrival_date = fields.Datetime(string='arrival_time')

    returned_client = fields.Datetime(string='is_returned_client')

    returned_store = fields.Datetime(string='is_returned_store')
    delivered = fields.Datetime(string='delivered')
    complaint = fields.Datetime(string='complaint')

    def show_tms_buttons(self):

        return {
            'name': _('TmsOrderButtons'),
            'type': 'ir.actions.client',
            'tag': 'tms_deliver_mode',
            'target': 'main',
            'context': self.read()[0],
        }

    @api.model
    def showPoint(self, pointId):

        points = self.search([])

        return [{'id': point.id, 'arrival_date': point.arrival_date,
                 'returned_client': point.returned_client, 'returned_store': point.returned_store,
                 'delivered': point.delivered, 'complaint': point.complaint} for point in points
                ]


    @api.model
    def saveInDB(self, dataTms):
        print(dataTms)
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
            elif dataAction['action'] == 'returned_store':
                record = self.env['tms.order'].search([('id', '=', dataAction['route_id'])], limit=1)
                record.returned_to_the_store = dataAction['tms_date']
            else:
                raise Exception()
        return 'Success'

    @api.model
    def getRoutesPoints(self, orderId):
        points = self.search([('order_id.id', '=', orderId)])
        return [
            {'id': point.id, 'company_name': point.route_point_id.res_partner_id.company_name,
             'street': point.route_point_id.res_partner_id.street
             , 'order_num': point.order_id.order_num,
             'arrival_date': point.arrival_date,
             'returned_client': point.returned_client, 'returned_store': point.returned_store,
             'delivered': point.delivered, 'complaint': point.complaint} for point in points]


    # @api.onchange("route_order_id.route_id.tmz")
    # def calculateTimeByTimezoneRoute(self):
    #     for record in self:
    #         tz = self.route_order_id.route_id.tmz
    #         record.arrival_date = pytz.utc.localize(self.arrival_date).astimezone(tz)
