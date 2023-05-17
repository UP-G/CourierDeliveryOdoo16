from odoo import api, fields, models, _

import datetime


class TmsRouteOrderRow(models.Model):
    _name = "tms.route.order.row"

    route_point_id = fields.Many2one('tms.route.point', required=True, ondelete='restrict',
                                     auto_join=True, index=True, string='route_point_id')
    route_order_id = fields.Many2one('tms.route.order', required=True, ondelete='restrict',
                                     auto_join=True, index=True, string='route_order_id')

    arrival_date = fields.Datetime(string='arrival_time')
    returned_client = fields.Datetime(string='is_returned_client')
    returned_store = fields.Datetime(string='is_returned_client')
    delivered = fields.Datetime(string='delivered')
    complaint = fields.Datetime(string='complaint')
