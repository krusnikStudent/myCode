//bulk updates of location on cage cards workspace 
$(document).ready(loadPage());

var locStore = [{
    oid: "000",
    value: null,
    location_oid: null
}];

var locCount = 0;
var locationPlaced = ".Column1 > span:nth-child(2) > div:nth-child(1)";

function uga_editBulkLoc() {
    $('#editbulkAUP').remove();
    $('#requestCards').remove();
    $('#deactivateCards').remove();
    $('#edit_nb').remove();
    $('#editbulkloc').remove();
    $('#editBulkPerDiem').remove();

    var roomComp = $.find('.textControl p');
    $(roomComp).replaceWith('<p style = "font-weight: bolder; font-size: 1.4em;">Update Location</p>');

    if (locCount == 0) {
        var oid, loc, selOID, selRow;
        var optionLocArr = [];
        var parsedlocData = {};
        var userLocStore = [{
            input_oid: "000",
            user_input: null
        }];
        var userBulkStore = [{
                input_oid: "001",
                user_input: null
            }

        ];

        //CHECKBOXES SETUP 
        var header = $('thead').find('tr');
        row = $.find('.drsv-row');
        list = $(row).find('.List');
        lastList = list[(list.length - 1)];
        inputs = $(lastList).clone().html('<input type = "checkbox">');
        placeholder = $(lastList).clone().html('<div></div>');
        toolArea = $('.DRSV-ToolArea').find('tbody');
        $(row).prepend(inputs);
        $(row).prepend(placeholder)
        $(locationPlaced).append('<button class = "button" type = "submit" onclick = editbulkloc()>Submit</button>');
        $(locationPlaced).append('<button class = "button" onclick = resetPage()>Cancel</button>');
        toolArea.append('<tr><td style = "color:#E4002B; font-weight: bolder; float: left; padding-top: 20px;" id = "instr0">PLEASE SELECT FROM LIST</td></tr>');
        toolArea.append('<label id = "bulklocLabel" for="bulkloc" style = "color:#E4002B;">Update All locations: </label>');
        toolArea.append('<input id = "bulkloc" type = "text"  placeholder = "Enter location">');
        $('#instr0').hide();

        //SELECT ALL FEATURE///
        var locSelectAllElement = $('<input type="checkbox" id = "locSelectAllInput">').change(function () {

            let locSelectAllElement = $(this);
            $(row).find(':checkbox').not(locSelectAllElement).each(function () {
                $(this).prop('checked', locSelectAllElement.prop('checked')).change();
            });
            $(row).find('span').show();
            $(row).find('.selected').hide();
            $('#instr0').show();
        });

        header.prepend('<td class = "selectAllHead DisplayHead"></td>');
        $('.selectAllHead').append(locSelectAllElement);
        $($.find('.DisplayHead')[0]).parent().prepend('<td class = "DisplayHead" id = "locSelectAllColumn" style = "font-weight: bold;">Select All</td>');

        /////CHECKING INDIVIDUAL CHECKBOXES/////
        $(row).find(':checkbox').not(locSelectAllElement).each(function () {
            loc = $(this).parent().parent()[0].children[7];
            //CREATE SELECTED loc FIELDS// 
            $(loc).append('<input class = "selected" id = "loc" placeholder = "Enter location" type = "text">');
            let loc_inp = $(loc).find('#loc');
            loc_inp.hide();

            $(this).on('change', function () {
                //CHECK FOR THE CURRENT OID//
                let checkOID;
                let urlOID = $(this).parent().parent().find('a')[0];
                checkOID = urlOID.toString().substring(urlOID.toString().indexOf("com.web"))

                if ($(this).prop('checked')) {
                    $('#instr0').show();
                    selRow = $(this).parent().parent();
                    oid = selRow.find('a')[0];
                    finOid = oid.toString().substring(oid.toString().indexOf("com.web"));
                    loc = selRow[0].children[7];

                    //SHOW/HIDE INPUT/SPAN location FIELDS
                    let loc_span = $(loc).find('span');
                    let loc_inp = $(loc).find('#loc');
                    loc_span.hide();
                    loc_inp.show();

                    //CREATE CARDs FOR STORES 
                    let userInpCard = {
                        input_oid: finOid,
                        user_input: null
                    };

                    let card = {
                        oid: finOid,
                        location_oid: null
                    };

                    console.log("UPDATED STORE")
                    console.log(locStore);

                    //ADD CARDS STORE 
                    let userObj = userLocStore[0];
                    if (userObj.input_oid.indexOf(finOid) === -1) {
                        userLocStore.unshift(userInpCard);
                    }

                    let obj = locStore[0];
                    if (obj.oid.indexOf(finOid) === -1) {
                        locStore.unshift(card);
                    }


                    //CHECK FOR THE SELECTED OID
                    $('.selected').keyup(function () {
                        let urlOID = $(this).parent().parent().find('a')[0];
                        selOID = urlOID.toString().substring(urlOID.toString().indexOf("com.web"));
                        $(this).addClass('uga_loading');
                    });

                    //GET INPUT STRING
                    $(loc).find('#loc').each(function () {
                        $(this).keyup(function () {
                            for (var i = 0; i < userLocStore.length; i++) {
                                if (userLocStore[i].input_oid == selOID) {
                                    let locVal = $(this).val();
                                    userLocStore[i].user_input = locVal.trim();
                                }
                            }
                        });
                    });

                    ////////////////////GET DATA FROM QUERY//////////////////
                    $(loc).find('#loc').each(function () {
                        let location = $(this);
                        location.keyup(function () {
                            if (location.val().length >= 2) {
                                new Promise(function (resolve, reject) {
                                        const results = PortalTools.callRemoteMethod("uga_cc_getBulkFacilityData", JSON.stringify(userLocStore)).success(successLocData());
                                        resolve(results);
                                    })
                                    .then(function (response) {
                                        location.removeClass('uga_loading');
                                        parsedlocData = JSON.parse(response);
                                        for (var i = 0; i < parsedlocData.length; i++) {
                                            if (optionLocArr.indexOf(parsedlocData[i].value) === -1) {
                                                optionLocArr.push(parsedlocData[i].value);
                                                //console.log(optionAupArr);
                                            }
                                        }
                                    })
                                    .then(function (reponse) {
                                        $('.selected').autocomplete({
                                            source: optionLocArr,
                                            select: selectLocOption
                                        });

                                        function selectLocOption(event, ui) {
                                            //UPDATE STORE//
                                            console.log('select')
                                            console.log(ui.item.value);
                                            for (var i = 0; i < parsedlocData.length; i++) {
                                                for (var j = 0; j < locStore.length; j++) {
                                                    if (locStore[j].oid == selOID) {
                                                        locStore[j].value = ui.item.value
                                                    }
                                                    if (locStore[j].oid == parsedlocData[i].oid && locStore[j].value == parsedlocData[i].value) {
                                                        let locOID = parsedlocData[i].location_oid
                                                        locStore[j].location_oid = locOID;
                                                    }
                                                }
                                            }
                                            //console.log("FINAL STORE")
                                            //console.log(locStore);  
                                        }
                                    })
                                    .catch(function (error) {
                                        console.log('Promise rejected: ' + reason);
                                    });
                            }
                        });
                    });

                    /////////GETTING BULK DATA FOR location///////////
                    $(toolArea).find('#bulkloc').keyup(function () {
                        $(this).addClass('uga_loading');
                        let locBulk = $(this).val();
                        for (var i = 0; i < userBulkStore.length; i++) {
                            userBulkStore[i].user_input = locBulk.trim();
                        }
                    });

                    ///////////// UPDATE ALL LOCS ////////////////////
                    $(toolArea).find('#bulkloc').keyup(function () {
                        let location = $(this);
                        if (location.val().length >= 2) {
                            new Promise(function (resolve, reject) {
                                    const results = PortalTools.callRemoteMethod("uga_cc_getBulkFacilityData", JSON.stringify(userBulkStore)).success(successLocData());
                                    resolve(results);
                                })
                                .then(function (response) {
                                    location.removeClass('uga_loading');
                                    parsedlocData = JSON.parse(response);
                                    for (var i = 0; i < parsedlocData.length; i++) {
                                        if (optionLocArr.indexOf(parsedlocData[i].value) === -1) {
                                            optionLocArr.push(parsedlocData[i].value);
                                            //console.log(optionAupArr);
                                        }
                                    }
                                })
                                .then(function (response) {
                                    location.autocomplete({
                                        source: optionLocArr,
                                        select: selectLocOption
                                    });

                                    function selectLocOption(event, ui) {
                                        //UPDATE STORE//
                                        console.log('select')
                                        console.log(ui.item.value);
                                        for (var i = 0; i < parsedlocData.length; i++) {
                                            for (var j = 0; j < locStore.length; j++) {
                                                locStore[j].value = ui.item.value;
                                                if (locStore[j].value == parsedlocData[i].value) {
                                                    let locOID = parsedlocData[i].location_oid
                                                    locStore[j].location_oid = locOID;
                                                }
                                            }
                                        }
                                        //console.log("FINAL STORE IN BULK");
                                        //console.log(locStore);  
                                    }
                                })
                                .catch(function (error) {
                                    console.log('Promise rejected: ' + reason);
                                });
                        }
                    });

                    ////END BULK/////		
                } else {
                    ///UNCHECK///
                    console.log("unchecked");
                    console.log(checkOID);
                    console.log("FINAL STORE IN BULK");
                    console.log(locStore);
                    for (var i = 0; i < locStore.length; i++) {
                        if (locStore[i].oid == checkOID) {
                            locStore.push(locStore.splice(locStore.indexOf(locStore[i]), 1)[0]);
                            locStore.pop();
                        }
                    }
                    for (var i = 0; i < userLocStore.length; i++) {
                        if (userLocStore[i].input_oid == checkOID) {
                            userLocStore.push(userLocStore.splice(userLocStore.indexOf(userLocStore[i]), 1)[0]);
                            userLocStore.pop();
                        }
                    }
                }
            });
        });
    }
    count++;
}

function editbulkloc() {
    PortalTools.callRemoteMethod("uga_cc_editBulkFacility", JSON.stringify(locStore)).success(successlocBulk());
}

function loadPage() {
    setTimeout(function () {
        if ($("#710E43230194A94787BA42D753D788FB_link").hasClass("active")) {
            $(locationPlaced).append("<button class = 'button' id = 'editbulkloc' onclick = uga_editBulkLoc()>Update Location</button>");
        }
    }, 1000);
}

function successLocData() {
    console.log("DATA SUCCESS");
}

function successlocBulk() {
    console.log("SUCCESS");
    setTimeout(function () {
        location.reload();
    }, 1000);
}