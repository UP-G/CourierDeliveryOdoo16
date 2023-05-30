from odoo import api, fields, models, _

import datetime


class TmsRoute(models.Model):
    _name = "tms.route"
    _description = 'Route'

    name = fields.Char(string='name', tracking=True, required=True)

    start_time = fields.Datetime(string='start_time')
    end_time = fields.Datetime(string='end_time')

    stock_id = fields.Many2one('res.partner', string='stock_id')



    @api.model
    def action_arrived(self):
        return datetime.datetime.now()

    @api.model
    def getRoutesForDriver(self):
        query = """SELECT id, name, start_time, end_time FROM tms_route
                   where id in (select DISTINCT route_id from tms_route_order where driver_id = %s)
                """

        self.env.cr.execute(query, [self.env.uid])

        return [{'id': id, 'name': name, 'start_time': start_time, 'end_time': end_time} for id, name, start_time, end_time in self.env.cr.fetchall()]

