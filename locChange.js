/**
 *@author css
 *@description : update oli's location with approved location on the approve activity in uga_order_import   
**/

$(document).ready(function () {
    editOrderLineItemLoc();

    function editOrderLineItemLoc() {
        var selected;
        var optionLocArr = [];
        var parsedlocData = {};

        var actLocStore = [{
            oid: "000",
            value: null,
            location_oid: null
        }]

        var actUserLocStore = [{
            input_oid: "000",
            user_input: null
        }];

        var dataTable = $.find('.DataTable');
        $('#_VIEW8D5F446FC62F67F_region_Region7_container').prepend('<span style = "color:#BA0C2F;position:relative;bottom:-2.5em; left: 10px; font-weight:600;">Check ALL order line items to confirm. To make changes, type and select new location, then hit OK.</span>');
        $(dataTable).find(':checkbox').each(function () {
            $(this).prop('checked', false);
            $(this).on('change', function () {
                var oid = this.defaultValue;

                if ($(this).prop('checked')) {
                    //console.log(oid);
                    var currentLoc = $(this).parent().parent().parent().parent().parent().parent().find('input.changeLoc')[0].name;
                    console.log("current location oid: " + currentLoc);

                    let card = {
                        oid: oid,
                        location_oid: currentLoc
                    }

                    let actUserInpCard = {
                        input_oid: oid,
                        user_input: null
                    }

                    //ADD CARDS STORE
                    let obj = actLocStore[0];
                    if (obj.oid.indexOf(oid) === -1) {
                        actLocStore.unshift(card);
                    }

                    let userObj = actUserLocStore[0];
                    if (userObj.input_oid.indexOf(oid) === -1) {
                        actUserLocStore.unshift(actUserInpCard);
                    }

                    console.log(actLocStore);
                    console.log(actUserLocStore);

                    //CHECK FOR SELECTED OID FOR LOADER
                    $('.changeLoc').keyup(function () {
                        selected = $(this).parent().parent().find(':checkbox')[0].defaultValue;
                        console.log("selected: " + selected);
                        $(this).addClass('uga_loading');
                    });

                    //GET INPUT STRING
                    $(dataTable).find('.changeLoc').each(function () {
                        $(this).keyup(function () {
                            for (var i = 0; i < actUserLocStore.length; i++) {
                                if (actUserLocStore[i].input_oid == selected) {
                                    let locVal = $(this).val();
                                    actUserLocStore[i].user_input = locVal.trim();
                                    //console.log(actUserLocStore);
                                }
                            }
                        });
                    });

                    ////////////////////GET DATA FROM QUERY//////////////////
                    $(dataTable).find('.changeLoc').each(function () {
                        let location = $(this);
                        location.keyup(function () {
                            //console.log('query')
                            if (location.val().length >= 2) {
                                /*
                                new Promise(function (resolve, reject) {
                                        
                                        
                                        //const results = PortalTools.callRemoteMethod("uga_cc_getBulkFacilityData", JSON.stringify(actUserLocStore)).success(successLocData());
                                       // resolve(results);
                                        //console.log("RESULTS")
                                        //console.log(results);
                                    })
                                 */
                                new Promise(function (resolve, reject) {
                                        const response = PortalTools.callRemoteMethod("uga_cc_getBulkFacilityData", JSON.stringify(actUserLocStore))
                                            .success(function () {
                                                resolve(response);
                                                successLocData();
                                            })
                                            .error(function (response) {
                                                reject(response)
                                            })

                                        //.success( function(){successLocData());
                                        //resolve(results);
                                        //console.log("RESULTS")
                                        //console.log(results);
                                    })
                                    .then(function (response) {
                                        location.removeClass('uga_loading');
                                        parsedlocData = JSON.parse(response);
                                        //console.log("parsedlocData:" + parsedlocData);
                                        for (var i = 0; i < parsedlocData.length; i++) {
                                            if (optionLocArr.indexOf(parsedlocData[i].value) === -1) {
                                                optionLocArr.push(parsedlocData[i].value);
                                                //console.log("optionLocArr" + optionLocArr);
                                            }
                                        }
                                        optionLocArr.sort();
                                    })
                                    .then(function () {
                                        $('.changeLoc').autocomplete({
                                            source: optionLocArr,
                                            select: selectLocOption
                                        });

                                        function selectLocOption(event, ui) {
                                            //UPDATE STORE//
                                            console.log('select')
                                            console.log(ui.item.value);
                                            for (var i = 0; i < parsedlocData.length; i++) {
                                                for (var j = 0; j < actLocStore.length; j++) {
                                                    if (actLocStore[j].oid == selected) {
                                                        actLocStore[j].value = ui.item.value
                                                    }
                                                    if (actLocStore[j].oid == parsedlocData[i].oid && actLocStore[j].value == parsedlocData[i].value) {
                                                        let locOID = parsedlocData[i].location_oid
                                                        actLocStore[j].location_oid = locOID;
                                                    }
                                                }
                                            }
                                            console.log("FINAL STORE")
                                            console.log(actLocStore);
                                            PortalTools.callRemoteMethod("oli_changeFacility", JSON.stringify(actLocStore)).success(successLocChange());
                                        }
                                    })
                                    .catch(function (e) {
                                        console.log('Promise rejected: ' + e + reason);
                                    });
                            }
                        });
                    });
                    ////////////////////////////UNCHECKED///////////////////////
                } else {
                    console.log("unchecked");
                    for (var i = 0; i < actLocStore.length; i++) {
                        //pushing oid to end of array 
                        if (actLocStore[i].oid == oid) {
                            actLocStore.push(actLocStore.splice(actLocStore.indexOf(actLocStore[i]), 1)[0]);
                            actLocStore.pop();
                        }
                    }

                    for (var i = 0; i < actUserLocStore.length; i++) {
                        //pushing oid to end of array 
                        if (actUserLocStore[i].input_oid == oid) {
                            actUserLocStore.push(actUserLocStore.splice(actUserLocStore.indexOf(actUserLocStore[i]), 1)[0]);
                            actUserLocStore.pop();
                        }
                    }
                    //console.log(actLocStore);
                }
            });
        });
    }
});

function successLocData() {
    console.log("DATA SUCCESS");
}

function successLocChange() {
    console.log("CHANGE SUCCESS")
}