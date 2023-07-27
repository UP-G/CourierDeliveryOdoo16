# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import api, fields, models, _


class TmsCancellation (models.Model):
    _name = 'tms.order.cancellation'

    name = fields.Char(required=True)
    comment_is_required = fields.Boolean()

    @api.model
    def getCancellation(self):
        cancellation = self.search([])
        return [
            {
                'id': item.id,
                'name': item.name,
                'comment_is_required': item.comment_is_required
            }
            for item in cancellation
            ]