/*
**@author css
**@description: constructs and returns a new url for the makeCSV activity template,
**using an existing ugaUtility resourceContainer
**@returns string 
*/

function uga_redirectCSV(str){
    try {
        var DEBUG = false;
        var DEBUG_PREFIX = "DEBUG [CustomRemoteMethod](uga_redirectCSV): ";
        if (DEBUG) {
            wom.log(DEBUG_PREFIX + "STARTING");
        }
        if (DEBUG) {
            wom.log(str);
        }
        var sch = ShadowSCH.getRealOrShadowSCH();
        var OID;
        var ugaUtil = ApplicationEntity.getResultSet("_uga_Utility");
        var csvTemplate = wom.getEntityFromString("com.webridge.entity.Entity[OID[1FA63EC53DC5BF41AEE9592DED43ACD6]]");

        if (ugaUtil) {
            if (DEBUG) {
                wom.log(DEBUG_PREFIX + "project found");
            }
            var elements = ugaUtil.elements();
            if (elements) {
                var count = elements.count();
                if (count > 1) {
                    for (var i = 1; i <= count; i++) {
                        if (elements(i).resourceContainer.template == csvTemplate) {
                            OID = elements(i).resourceContainer;
                            if (DEBUG) {
                                wom.log(DEBUG_PREFIX + "correct workspace found");
                            }
                        } 
                    }
                }
            }

            if (OID) {
                var unsUrlPath = "Rooms/DisplayPages/LayoutInitial?Container=" + OID;
                var url = sch.fullUrlFromUnsUrl(unsUrlPath);

                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + "the url" + url);
                }
            }
            return url;
        }

    } catch (e) {
        wom.log(DEBUG_PREFIX + "ERROR: " + e.description);
        throw e;
    }
}