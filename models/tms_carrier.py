from odoo import api, fields, models, _


class TmsCarrier(models.Model):
    _name = "tms.carrier"
    _description = 'Carrier'

    name = fields.Char(string='Name', tracking=True, required=True)
    contact_info = fields.Char(string='Contact information')
    ref_key = fields.Char(string='carrier key')
    carrier_route_ids = fields.One2many('tms.carrier.route', 'carrier_id', string='Carrier route ids')
    
    _sql_constraints= [('unique_driver_name', 'unique(name)', 'Name must by unique')]