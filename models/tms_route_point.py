from odoo import api, fields, models, _

import datetime

class TmsRoutePoint(models.Model):
    _name = "tms.route.point"

    res_partner_id = fields.Many2one('res.partner', required=True, index=True, string='res_partner_id')
    route_id = fields.Many2one('tms.route', required=True, index=True, string='route_id')


