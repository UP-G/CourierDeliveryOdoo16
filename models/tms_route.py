from odoo import api, fields, models, _

class TmsRoute(models.Model):
    _name = "tms.route"
    _description = 'Route'

    name = fields.Char(string='name', tracking=True, required=True)

    start_time = fields.Datetime(string='start_time')
    end_time = fields.Datetime(string='end_time')

    stock_id = fields.Many2one('res.partner', string='stock_id')

