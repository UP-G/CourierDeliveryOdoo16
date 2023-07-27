from odoo import api, fields, models, _

class TmsCarrierRoute(models.Model):
    _name = "tms.carrier.route"
    _description = 'Carrier route'

    name = fields.Char(string='Name', required=True)

    carrier_id = fields.Many2one('tms.carrier', string='Carrier id')
    driver_id = fields.Many2one('tms.carrier.driver', string='Carrier driver id')
    route_id = fields.Many2one('tms.route', string='Route id')

    def create_carrier_route(self, carrier_id, carrier_name, route_ids):
        carrier = self.search([('carrier_id', '=', carrier_id)])
        if not carrier:
            for item in route_ids:
                self.create({
                    'name': carrier_name,
                    'carrier_id': carrier_id,
                    'route_id': item
                })
            return
        
        rote_cur_list = [r['id'] for r in carrier.route_id]
        tk_id_not_driver = list(set(route_ids) - set(rote_cur_list))
        for item in tk_id_not_driver:
                self.create({
                     'name': carrier_name,
                    'carrier_id': carrier_id,
                    'route_id': item
                })
