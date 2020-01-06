const DESIGN_SYSTEM_SVG = /sprite-icons.svg$/;

module.exports = [
    {
        test: /\.(bmp|png|jpg|jpeg|gif|svg)$/,
        loader: 'file-loader',
        exclude: DESIGN_SYSTEM_SVG,
        options: {
            name: 'assets/img/[name].[hash:8].[ext]'
        }
    },
    {
        test: DESIGN_SYSTEM_SVG,
        use: [
            {
                loader: 'svg-inline-loader'
            }
        ]
    },
    {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: [
            {
                loader: 'file-loader',
                options: {
                    name: 'assets/fonts/[name].[ext]'
                }
            }
        ]
    }
];
