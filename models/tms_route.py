from odoo import api, fields, models, _

import datetime


class TmsRoute(models.Model):
    _name = "tms.route"

    name = fields.Char(string='name', tracking=True, required=True)

    start_time = fields.Datetime(string='start_time')
    end_time = fields.Datetime(string='end_time')

    stock_id = fields.Many2one('res.partner', string='stock_id')

    @api.model
    def action_arrived(self):
        return datetime.datetime.now()
