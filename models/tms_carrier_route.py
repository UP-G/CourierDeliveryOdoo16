from odoo import api, fields, models, _

class TmsCarrierRoute(models.Model):
    _name = "tms.carrier.route"
    _description = 'Carrier route'

    name = fields.Char(string='Name', tracking=True, required=True)

    carrier_id = fields.Many2one('tms.carrier', string='Carrier id')
    carrier_driver_id = fields.Many2one('tms.carrier.driver', string='Carrier driver id')
    route_id = fields.Many2one('tms.route', string='Route id')
