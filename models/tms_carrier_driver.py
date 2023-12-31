from odoo import api, fields, models, _


class TmsCarrierDriver(models.Model):
    _name = "tms.carrier.driver"
    _description = 'Carrier driver'

    name = fields.Char(string='Name', required=True)
    # inn = fields.Char(string="inn")
    # snils = fields.Char(string="snils")
    # tm_code = fields.Char(string="tm code")
    user_id = fields.Many2one('res.users', string='Driver id')