from odoo import api, fields, models, _

import datetime


class TmsRouteOrder(models.Model):
    _name = "tms.route.order"

    driver_id = fields.Many2one('res.users', required=True, ondelete='restrict', index=True, string='driver_id')
    route_id = fields.Many2one('tms.route', required=True, ondelete='restrict', index=True, string='route_id')
    order_num = fields.Char(string='order_num', required=True)
