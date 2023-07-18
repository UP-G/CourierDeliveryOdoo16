from odoo import api, fields, models, _


class TmsDeliveryRow(models.Model):
    _name = "tms.delivery.row"
    _description = 'Delivery row'

    name = fields.Char(string='Name', tracking=True, required=True)
    impl_num = fields.Char(string='Implemention Number', tracking=True, required=True)
    comment = fields.Char(string='Comment', tracking=True, required=True)
    selected_1c = fields.Boolean(string='Selected by 1C')
    order_row_id = fields.Many2one('tms.order.row', string='Order row id')
    delivery_id = fields.Many2one('tms.delivery', string='Delivery id')

    driver_key = fields.Char(string='Driver key', compute='_compute_driver_key', store=True)
    stock_id = fields.Char(string='Stock id', compute='_compute_stock_id', store=True)
    @api.depends('delivery_id.driver_key')
    def _compute_driver_key(self):
        for record in self:
            record.driver_key = record.delivery_id.driver_key

    @api.depends('delivery_id.route_id.stock_id')
    def _compute_stock_id(self):
        for record in self:
            print(record.delivery_id.route_id.stock_id)
            record.stock_id = record.delivery_id.route_id.stock_id.name

    original_id = fields.Integer(string='Original ID', compute='_compute_original_id', readonly=True, copy=False)

    def _compute_original_id(self):
        for record in self:
            record.original_id = record.id

    def action_create_tms_order(self):
        context = dict(self._context or {})
        delivery_row_array = self.env['tms.delivery.row'].browse(context.get('active_ids'))
        record_list = []

        for delivery_row in delivery_row_array:
            print(delivery_row.delivery_id)
            values = {
                'id': delivery_row.id,
                'name': delivery_row.name,
                'impl_num': delivery_row.impl_num,
                'comment': delivery_row.comment,
                'selected_1c': delivery_row.selected_1c,
                'order_row_id': delivery_row.order_row_id.id,
                'delivery_id': delivery_row.delivery_id.id
            }
            record_list.append((1, delivery_row.id, values))

        return {
            'type': 'ir.actions.act_window',
            'name': 'Create Order',
            'res_model': 'tms.order.wizard',
            'view_mode': 'form',
            'target': 'new',
            'context': {'default_point_ids': record_list}
        }

