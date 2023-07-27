from odoo import api, fields, models, _

class TmsUser(models.Model):
    _inherit = ['res.users']

    tms_route_id = fields.Many2One('tms.route', string='Responsible', tracking=True)

