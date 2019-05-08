//sends checkbox selections to CRM uga_finalDocData

$(document).ready(function () {
    finalizeDocs();

    function finalizeDocs() {
        //to store oids to be changed   
        var docArray = [];
        //refresh
        //$(locationPlaced).append('<button class = "button" onclick = resetPage()>Cancel</button>');

        //set up
        //var dataTable = $.find('.DataTable');
        var dataTable = $.find('.docTable');
        $(dataTable).find(':checkbox').each(function () {
            $(this).prop('checked', false);
            $(this).on('change', function () {
                //get original oid
                //var oid = this.name;
                var oid = this.value;
                console.log("check");
                if ($(this).prop('checked')) {

                    //ADD CARDS STORE
                    if (docArray.indexOf(oid) === -1) {
                        docArray.push(oid);
                    }
                    console.log(docArray);
                    ////////////////////////////UNCHECKED///////////////////////
                } else {
                    console.log("unchecked");
                    console.log("oid");
                    for (var i = 0; i < docArray.length; i++) {
                        //pushing oid to end of array 
                        if (docArray[i] == oid) {
                            docArray.push(docArray.splice(docArray.indexOf(docArray[i]), 1)[0]);
                            docArray.pop();
                        }
                    }

                }
                //call the remote method 
                //PortalTools.callRemoteMethod("uga_finalDocData", JSON.stringify(docArray)).success(finalizedSuccess()); 
                new Promise(function (resolve, reject) {
                    const response = PortalTools.callRemoteMethod("uga_finalDocData", JSON.stringify(docArray))
                        .success(function () {
                            resolve(response);
                            finalizedSuccess();
                        })
                        .error(function (response) {
                            reject(response)
                        })
                })
            });
        });
    }
});

function finalizedSuccess() {
    console.log("FINALIZATION SUCCESS");
}