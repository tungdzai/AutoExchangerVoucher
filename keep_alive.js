const http = require("http");

const PORT = process.env.PORT || 8080;

http
    .createServer(function (req, res) {
        res.write("Exchanger Voucher");
        res.end();
    })
    .listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
