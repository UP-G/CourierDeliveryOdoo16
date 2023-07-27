from odoo import api, fields, models, _


class TmsOrderWizard(models.TransientModel):
    _name = 'tms.order.wizard'
    _description = 'Order Wizard'

    order_name = fields.Char(string='Order name')
    driver_id = fields.Many2one('res.users', string='Driver id')
    carrier_id = fields.Many2one('tms.carrier', string='Carrier id')
    point_ids = fields.One2many('tms.delivery.row', 'original_id', string='Selected Points', readonly=True)

    def add_order(self):
        context = dict(self._context or {})
        delivery_row = self.env['tms.delivery.row'].browse(context.get('active_ids'))

        if self.order_name == '':
            order_num = delivery_row[0].delivery_id.order_num
        else:
            order_num = self.order_name

        order_tms = self.env['tms.order'].create({
            'route_id': delivery_row[0].delivery_id.route_id.id,
            'order_num': order_num,
            'driver_id': self.driver_id.id,
            'carrier_id': self.carrier_id.id,
        })

        row_ids = []
        for row in delivery_row:
            tms_order_row = self.env['tms.order.row'].create({
                'order_id': order_tms.id,
                'impl_num': row.impl_num,
                'comment': row.comment,
            })

            row.order_row_id = tms_order_row.id
            row_ids.append(tms_order_row.id)

        order_tms.order_row_ids = self.env['tms.order.row'].browse(row_ids)

        return {'type': 'ir.actions.act_window_close'}
