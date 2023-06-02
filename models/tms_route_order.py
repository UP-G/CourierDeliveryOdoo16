from odoo import api, fields, models, _

import datetime


class TmsRouteOrder(models.Model):
    _name = "tms.route.order"
    _description = 'Route order'

    driver_id = fields.Many2one('res.users', required=True, ondelete='restrict', index=True, string='driver_id')
    route_id = fields.Many2one('tms.route', required=True, ondelete='restrict', index=True, string='route_id')
    arrived_for_loading = fields.Datetime(string='arrived_for_loading')
    departed_on_route = fields.Datetime(string='departed_on_route')
    finished_the_route = fields.Datetime(string='finished_the_route')
    returned_to_the_store = fields.Datetime(string='returned_to_the_store')
    order_num = fields.Char(string='order_num', required=True)
    rows_id = fields.One2many(comodel_name='tms.route.order.row', inverse_name="route_order_id", string='rows')

    @api.model
    def wasArrivedRorLoading(self, id):
        record = self.env['tms.route.order'].search([('id', '=', id)], limit=1)
        record.arrived_for_loading = datetime.datetime.now()
        return record.arrived_for_loading

    @api.model
    def wasDepartedOnRoute(self, id):
        record = self.env['tms.route.order'].search([('id', '=', id)], limit=1)
        record.departed_on_route = datetime.datetime.now()
        return record.departed_on_route

    @api.model
    def wasFinishedTheRoute(self, id):
        record = self.env['tms.route.order'].search([('id', '=', id)], limit=1)
        record.finished_the_route = datetime.datetime.now()
        return record.finished_the_route

    @api.model
    def wasReturnedStore(self, id):
        record = self.env['tms.route.order'].search([('id', '=', id)], limit=1)
        record.returned_to_the_store = datetime.datetime.now()
        return record.returned_to_the_store

    def click_button(self):
        return {
            'name': _('TmsTreePython'),
            'type': 'ir.actions.act_window',
            'res_model': 'tms.route.order.row',
            'view_mode': 'tree',
            'domain': [('route_order_id', '=', self.read()[0]['id'])],
        }

    def name_get(self):
        return [(record.id, '{num}, {route}'.format(num=record.order_num, route=record.route_id.name)) for record in self]
