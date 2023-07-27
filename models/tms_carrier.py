from odoo import api, fields, models, _


class TmsCarrier(models.Model):
    _name = "tms.carrier"
    _description = 'Carrier'

    name = fields.Char(string='Name', required=True)
    tc_type=fields.Char(string='transport company type')
    code = fields.Char(string='code')
    carrier_route_ids = fields.One2many('tms.carrier.route', 'carrier_id', string='Carrier route ids')