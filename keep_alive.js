const http = require("http");

http
    .createServer(function (req, res) {
        res.write("Exchanger Voucher");
        res.end();
    })
    .listen(8080, () => {
        console.log("Server is running on port 8080");
    });
