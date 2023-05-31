from odoo import api, fields, models, _

import datetime


class TmsRouteOrder(models.Model):
    _name = "tms.route.order"
    _description = 'Route order'

    driver_id = fields.Many2one('res.users', required=True, ondelete='restrict', index=True, string='driver_id')
    route_id = fields.Many2one('tms.route', required=True, ondelete='restrict', index=True, string='route_id')
    order_num = fields.Char(string='order_num', required=True)

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
