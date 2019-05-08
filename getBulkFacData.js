/**
 * @author: css
 * @credit: pd, see uga_cch_getFacilityOptionData
 * @param json 
 */
function uga_cc_getBulkFacilityData(json)
{
	try {
	    var DEBUG_PREFIX = "[CUSTOM REMOTE METHOD]uga_cc_getBulkFacilityData: ";
	    var DEBUG = false;
		if (DEBUG) wom.log(DEBUG_PREFIX + " STARTING getting location data...")
		
	    var parsedLocInput = JSON.parse(json, null);
	    var results = [];
	
	    for(var i = 0; i < parsedLocInput.length; i++){
	        if(parsedLocInput[i].input_oid !== "000"){
	            //wom.log(DEBUG_PREFIX + parsedLocInputStore[i].oid + " is the current input card");
	            var locSet = ApplicationEntity.getResultSet("_Facility").query("customAttributes.uga_suiteName_roomName like '%" + parsedLocInput[i].user_input + "%'").elements();      
	            if (locSet) {
	                var locSetCount = locSet.count();
	                var location, value, dataCard;
	                for (var j = 1; j <= locSetCount; j++) {
	                    location = locSet(j);
	                    value = location.getQualifiedAttribute("customAttributes.uga_suiteName_roomName");
	                    dataCard = {
	                    	oid: parsedLocInput[i].input_oid, 
	                        location_oid: location + "",
	                        value: value
	                    }
                        results.push(dataCard);
	                }
	            }
	        }
	    }
        return JSON.stringify(results, null, "");
        //wom.log(DEBUG_PREFIX + "returned loc data");
	} catch (e) {
	   wom.log(DEBUG_PREFIX + "error: " + e.description)
	}
}