from odoo import api, fields, models, _


class TmsCarrierDriver(models.Model):
    _name = "tms.carrier.driver"
    _description = 'Carrier driver'

    name = fields.Char(string='Name', tracking=True, required=True)
    ref_key= fields.Caher(string="driver key")
    inn = fields.Caher(string="inn")
    tm_code= fields.Char(string='tm code')
    snils = fields.Caher(string="snils")
    tm_code = fields.Caher(string="tm code")
    driver_id = fields.Many2one('res.users', string='Driver id')