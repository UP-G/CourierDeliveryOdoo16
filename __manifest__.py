{
    'name': 'tms_test',
    'category': 'Technical',
    'sequence': -100,
    'author': 'TrackMotors',
    'depends': ["web", "bus", "base", "mail", "hr_attendance"],
    'data': [
        'security/ir.model.access.csv',
        'security/tms_security.xml',
        'views/tms_route_view.xml',
        'views/tms_route_order_view.xml',
        'views/tms_route_order_row_view.xml',
        'views/tms_route_point.xml',
        'views/tms_deliver_view.xml',
        'views/tms_menu_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'tms/static/src/js/*.js',
            'tms/static/src/xml/**/*',
            'tms/static/src/css/tms_route_widget.css',
        ],
    },
    'installable': True,
    'application': True,
}