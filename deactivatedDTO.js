/** 
 *@author css
 *@description : this method parses the cage card history object set and returns the last instance of 
 *a cage card being made deactivated.
**/
function uga_getDeactivatedDTO() {
    try {
        var DEBUG = false;
        var DEBUG_PREFIX = "DEBUG [_CageCards](uga_getDeactivatedDTO): ";

        if (DEBUG) {
            wom.log(DEBUG_PREFIX + "STARTING...");
            wom.log(DEBUG_PREFIX + this.ID);
        }

        var historyItems = this.getQualifiedAttribute("customAttributes.uga_cageCard_history");
        var deactivatedDateTimeOut = getDeactivatedDateTimeOut();
        return deactivatedDateTimeOut;

        function getDeactivatedDateTimeOut() {
            try {
                var deactivatedDTO;
                if (CustomUtils.uga_entitySetIsNotEmpty(historyItems)) {
                    var hElements = historyItems.elements();
                    var hCount = hElements.count();
                    for (var i = 1; i <= hCount; i++) {
                        //if (DEBUG) {wom.log(DEBUG_PREFIX + "in loop...")}
                        var item = hElements(i);

                        if (item.uga_isLastItem()) {
                            if (DEBUG) {wom.log(DEBUG_PREFIX + "got last item...")}
                            deactivatedDTO = getdeactivatedDTO(item);

                            function getdeactivatedDTO(historyItem) {
                                //if (DEBUG) { wom.log(DEBUG_PREFIX + "executing getdeactivatedDTO method...")}
                                var activityType = historyItem.getQualifiedAttribute("customAttributes.activityType");
                                var deactivatedD;

                                switch (activityType) {
                                    case "_CageCard_offCensus":
                                        deactivatedD = getCorrectDate(historyItem);
                                        break;
                                    case "Deactivate Cards":
                                        deactivatedD = getCorrectDate(historyItem);
                                        break;
                                    default:
                                        deactivatedD = checkPrevious(historyItem);
                                        break;
                                }
                                return deactivatedD;
                            }

                            function getCorrectDate(theItem) {
                                //if (DEBUG) {wom.log(DEBUG_PREFIX + "executing getCorrectDate method...")}
                                var d = theItem.getQualifiedAttribute("customAttributes.dateTimeOut");
                                var correctDate;
                                if (d) {
                                    correctDate = (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear();
                                    //if (DEBUG) {wom.log(DEBUG_PREFIX + "DTO is " + correctDate);}
                                    return correctDate;
                                } else {
                                    d = theItem.getQualifiedAttribute("customAttributes.dateTimeIn");
                                    correctDate = (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear();
                                    //if (DEBUG) {wom.log(DEBUG_PREFIX + "DTI is " + correctDate);}
                                    return correctDate;
                                }
                            }

                            function checkPrevious(theItem) {
                                if (DEBUG) {
                                    wom.log(DEBUG_PREFIX + "executing checkPrevious method...")
                                }
                                var previous = theItem.getQualifiedAttribute("customAttributes.uga_chain_previous");
                                if (previous) {
                                    //if (DEBUG) { wom.log(DEBUG_PREFIX + "previous ID is " + previous.ID)}
                                    var activityType = previous.getQualifiedAttribute("customAttributes.activityType");
                                    if (previous !== theItem) {
                                        return getdeactivatedDTO(previous);
                                    } else if (activityType != "_CageCard_offCensus" || activityType != "_CageCard_offCensus") {
                                        return null;
                                    }
                                } else {
                                    return null;
                                }
                            }
                        }
                    }
                    return deactivatedDTO;
                } else {
                    //if (DEBUG) {wom.log(DEBUG_PREFIX + "no history items found! ")}
                    return null;
                }

            } catch (e) {
                wom.log(DEBUG_PREFIX + "ERROR: " + e.description);
                throw e;
            }
        }

    } catch (e) {
        wom.log(DEBUG_PREFIX + "ERROR: " + e.description);
        throw e;
    }
}