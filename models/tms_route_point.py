from odoo import api, fields, models, _

import datetime

class TmsRoutePoint(models.Model):
    _name = "tms.route.point"
    _description = 'Route point'

    res_partner_id = fields.Many2one('res.partner', required=True, index=True, string='res_partner_id')
    route_id = fields.Many2one('tms.route', required=True, string='route_id')

    def name_get(self):
        return [(record.id, '{partner}, {route}'.format(partner=record.res_partner_id.name, route=record.route_id.name)) for record in self]


