from odoo import api, fields, models, _

import datetime

class TmsRoutePoint(models.Model):
    _name = "tms.route.point"
    _description = 'Route point'

    res_partner_id = fields.Many2one('res.partner', required=True, index=True, string='res_partner_id')
    route_id = fields.Many2one('tms.route', required=True, index=True, string='route_id')

    @api.model
    def getRoutesPoints(self, routeId):
        query = """SELECT tms_route_point.id, company_name, order_num, arrival_date, returned_client, returned_store, delivered, complaint FROM tms_route_point
                    INNER JOIN tms_route_order_row ON tms_route_order_row.route_point_id = tms_route_point.id
                    INNER JOIN tms_route_order ON tms_route_order_row.route_order_id = tms_route_order.id
                    inner join res_partner ON res_partner.id = tms_route_point.res_partner_id
                    where driver_id = %s and tms_route_point.route_id = %s
                       """

        self.env.cr.execute(query, [self.env.uid, routeId])

        return [{'id': id, 'company_name': company_name, 'order_num': order_num, 'arrival_date': arrival_date,
                 'returned_client': returned_client, 'returned_store': returned_store,
                 'delivered': delivered, 'complaint': complaint} for
                id, company_name, order_num, arrival_date, returned_client, returned_store, delivered, complaint
                in self.env.cr.fetchall()]


    def name_get(self):
        return [(record.id, '{partner}, {route}'.format(partner=record.res_partner_id.name, route=record.route_id.name)) for record in self]
