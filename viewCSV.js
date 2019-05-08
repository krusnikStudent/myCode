//@author css
$(document).ready(function () {
    var count = 0;
    if (count == 0) {
        console.log("READY");
        var str = "getReady";
        new Promise(function (resolve, reject) {
            const response = PortalTools.callRemoteMethod("uga_redirectCSV", str)
                .success(function () {
                    resolve(response);
                    success();
                })
                .error(function (response) {
                    reject(response);
                    console.log("failure")
                })
                .then(function (response) {
                    var url = response;
                    console.log("make csv url is ");
                    console.log(response);
                    $("#makecsv").attr('href', url);
                    console.log("complete");

                })
        });
        count++;
    }
});

function success() {
    console.log("success redirect");
}