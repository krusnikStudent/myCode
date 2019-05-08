/**
 * @author css
 * @description : executed from the Update Location button on cage cards workspace;
 *this method checks the date selected (described below) and updates the facility
 *on the selected cards
 * @param {string} json
**/
function uga_cc_editBulkFacility(json) {
    try {
        var DEBUG = true;
        var DEBUG_PREFIX = "[CUSTOM REMOTE METHOD](uga_cc_editBulkFacility): ";
        if (DEBUG) {wom.log(DEBUG_PREFIX + "STARTING...");}

        Date.prototype.removeTime = function () {
            return new Date(this.toLocaleDateString());
        }

        var parsedStore = JSON.parse(json, null);
        var ccToUpdate = checkDates(parsedStore);

        if (DEBUG) {wom.log(DEBUG_PREFIX + "setting up for activity");}
        var checkedCards = ccToUpdate.cardsToUpdate;
        var theCheckedDate = ccToUpdate.dateToUpdate;
        for (var y = 0; y < checkedCards.length; y++) {
            if (checkedCards[y].oid !== "000") {
                CustomUtils.uga_createActivity(
                    "_CageCard_EditBulkLoc",
                    checkedCards[y].oid,
                    null, {
                        "customAttributes.dateToUpdate": theCheckedDate,
                        "customAttributes.cardToUpdate": checkedCards[y].oid,
                        "customAttributes.newLocation": checkedCards[y].location_oid
                    }
                );
            }
        }

        //3/11/2019 css, updated to work with bulk loc
        /**
         *@author pd
         *  @description throw an error if the user enters a date that is EARLIER than ANY of the selected Cage Cards'
         * latest history item's value for dateTimeIn
         * JIRA: ANOPS-646
         * @param {date || string} checkDate the date to check against
         * @param {array} resourceContainerArray array of Resource Container OID strings (pulled from Custom Search table links)
         * @returns {array} array of Cage Card entities (converted from OID strings)
        */
        function checkDates(store) {
            if (DEBUG) {wom.log(DEBUG_PREFIX + "checkDates() beginning: ");}
            var checkDate = store.dateToUpdate;
            var resourceContainerArray = store.cardsToUpdate;

            try {
                if (typeof checkDate === "string") {
                    if (DEBUG) {wom.log(DEBUG_PREFIX + "checkDate was string: " + checkDate);}
                    // String gymnastic necessary here due to date value coming in in the format of "YYYY-MM-DD"
                    checkDate = new Date(checkDate.substring(5) + "-" + checkDate.substring(0, 4));
                }
                //var results = [];

                for (var i = 0; i < resourceContainerArray.length; i++) {
                    if (resourceContainerArray[i].oid !== "000") {
                        if (DEBUG) {wom.log(DEBUG_PREFIX + "Processing Cage Card for Cost Center Updates: " + resourceContainerArray[i].oid);}

                        var resourceContainer = CustomUtils.uga_verifyEntityReference(resourceContainerArray[i].oid);
                        Assert.Entity(resourceContainer, 'OID not valid: ' + resourceContainerArray[i].oid);

                        // must handle situation in which cc's workspace has not been initialized
                        //var cageCard = resourceContainer.resource;
                        var cageCard;
                        if (resourceContainer.getEntityTypeName() === "ResourceContainer") {
                            cageCard = resourceContainer.resource;
                            if (DEBUG) {wom.log(DEBUG_PREFIX + "Got CC..." + cageCard);}
                        } else {
                            cageCard = CustomUtils.uga_createDefaultWorkspaceForProject(resourceContainer);
                            if (DEBUG) {wom.log(DEBUG_PREFIX + "Got CC through uga_createDefaultWorkspaceForProject..." + cageCard);}
                        }
                        Assert.Entity(cageCard, 'Resource Container entity did not contain a resource: ' + resourceContainerArray[i].oid);
                        if (DEBUG) {wom.log(DEBUG_PREFIX + "Now proceeding to latest history item");}
                        var latestHistoryItem = cageCard.uga_chain_getLatestHistoryItem();
                        if (latestHistoryItem) {
                            if (DEBUG) {wom.log(DEBUG_PREFIX + "Got latest history item..." + latestHistoryItem);}
                        }
                        if (!latestHistoryItem) {
                            if (DEBUG) {wom.log(DEBUG_PREFIX + "No history found. Running uga_initializeCageCardHistory() on Cage Card");}
                            //latestHistoryItem = cageCard.uga_initializeCageCardHistory(null, checkDate);
                            var latestHistoryItem = cageCard.uga_initializeCageCardHistory(null, checkDate);
                            if (DEBUG) {wom.log(DEBUG_PREFIX + "latest history item..." + latestHistoryItem);}
                        }
                        Assert.NotNull(latestHistoryItem, 'uga_chain_getLatestHistoryItem() returned null for Cage Card: ' + cageCard);

                        var latestDateIn = new Date(latestHistoryItem.getQualifiedAttribute("customAttributes.dateTimeIn"));
                        wom.log(DEBUG_PREFIX + "latestDateIn: " + latestDateIn);
                        Assert.NotNull(latestDateIn, 'The latestHistoryItem did not have a value for dateTimeIn');

                        if (DEBUG) {wom.log(DEBUG_PREFIX + "checkDate of: " + checkDate.removeTime());}
                        if (DEBUG) {wom.log(DEBUG_PREFIX + "latestDateIn of: " + latestDateIn.removeTime());}
                        Assert.True(checkDate.removeTime() >= latestDateIn.removeTime(), "CheckDate must be AFTER the latest history items' dateTimeIn.");

                        //results.push(cageCard);
                        resourceContainerArray[i].oid = cageCard;
                        if (DEBUG) {wom.log(DEBUG_PREFIX + "card to update " + resourceContainerArray[i].oid);}
                    }
                }
                return store;

            } catch (e) {
                wom.log(DEBUG_PREFIX + "ERROR - checkDates(): " + e.description);
                throw e;
            }
        }
        if (DEBUG) {wom.log(DEBUG_PREFIX + " facility changes complete");}
    } catch (e) {
        if (DEBUG) {
            wom.log(DEBUG_PREFIX + "ERROR: " + e.description);
        }
        throw e;
    }
}