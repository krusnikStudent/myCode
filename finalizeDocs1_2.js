/**
 *@author css 
 *@description : executed from the Finalize Documents activity in _Submission.
 *This method creates a new document, copies the selected draft doc,
 *and sets it to a prop used in the finalizeDocuments method    
 *@param {string } stringified JSON
**/
function uga_finalDocData(json) {
    try {
        var DEBUG = false;
        var DEBUG_PREFIX = "[CUSTOM REMOTE METHOD](uga_finalDocData): ";
        if (DEBUG) {
            wom.log(DEBUG_PREFIX + " starting...");
        }

        var parsedStore = JSON.parse(json, null);

        for (var i = 0; i < parsedStore.length; i++) {
            var parsedDocEntity = wom.getEntityFromString(parsedStore[i]);
            var draft = parsedDocEntity.getQualifiedAttribute("customAttributes.draftVersion");
            if (DEBUG) {
                wom.log(DEBUG_PREFIX + "getting draft..." + draft);
            }

            //create a new document with draft
            var newDocument = Document.createEntity();
            newDocument.ID = Document.getID();
            newDocument.dateCreated = new Date();
            newDocument.name = draft.name;
            var user = Person.getCurrentUser();
            newDocument.owner = user;
            newDocument.author = user;
            newDocument.targetUrl = draft.targetUrl;
            if (DEBUG) {
                wom.log(DEBUG_PREFIX + "created new document..." + newDocument);
            }

            //set the new doc to draf to finalize
            parsedDocEntity.setQualifiedAttribute("customAttributes.draftToFinalize", newDocument);
            draftToFinalize = parsedDocEntity.getQualifiedAttribute("customAttributes.draftToFinalize");
            if (DEBUG) {
                wom.log(DEBUG_PREFIX + "getting draft to finalize..." + draftToFinalize);
            }
        }
        if (DEBUG) {
            wom.log("doc for finalization set");
        }
    } catch (e) {
        wom.log(DEBUG_PREFIX + "ERROR: " + e.description);
        throw e;
    }
}