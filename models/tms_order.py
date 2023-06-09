from odoo import api, fields, models, _

import datetime


class TmsOrder(models.Model):
    _name = "tms.order"
    _description = 'Route order'

    driver_id = fields.Many2one('res.users', ondelete='restrict', index=True, string='driver_id')
    route_id = fields.Many2one('tms.route', ondelete='restrict', index=True, string='route_id')
    arrived_for_loading = fields.Datetime(string='arrived_for_loading')
    departed_on_route = fields.Datetime(string='departed_on_route')
    finished_the_route = fields.Datetime(string='finished_the_route')
    returned_to_the_store = fields.Datetime(string='returned_to_the_store')
    order_num = fields.Char(string='order_num', required=True)

    def getRows(self):
        return {
            'name': _('TmsTreePython'),
            'type': 'ir.actions.act_window',
            'res_model': 'tms.order.row',
            'view_mode': 'tree',
            'domain': [('order_id', '=', self.read()[0]['id'])],
        }

    @api.model
    def getRoutesForDriver(self):

        records = self.search([])

        print([{'id': record.id, 'name': record.order_num, 'start_time': record.route_id.start_time, 'end_time': record.route_id.end_time} for record in records])
        return [{'id': record.id, 'name': record.order_num, 'start_time': record.route_id.start_time, 'end_time': record.route_id.end_time} for record in records]

    def name_get(self):
        return [(record.id, '{num}, {route}'.format(num=record.order_num, route=record.route_id.name)) for record in self]
