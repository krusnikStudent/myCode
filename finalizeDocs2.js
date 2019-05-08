/** 
 *@author css
 *@description : executed on the Finalize Documents activity in _Submission.
 *This method sets the final version of the doc, turning it into a pdf, sets 
 *the last finalized date and adds an approved watermark to the final pdf  
 *@param {entity } targetEntity
 *@param {object } sch   
**/

function finalizeDocuments(targetEntity, sch) {
    try {
        var DEBUG = false;
        var DEBUG_PREFIX = "[CustomUtils](finalizeDocuments): ";
        if (DEBUG) {
            wom.log(DEBUG_PREFIX + " starting...");
        }

        //assertions check
        //first make sure we are dealing with a fully formed entity
        Assert.NotNull(targetEntity, 'target entity cannot be null');
        Assert.Entity(targetEntity, "this is not a valid entity or project");

        var attachments = targetEntity.getQualifiedAttribute("customAttributes.attachments");

        if (attachments) {
            var elements = attachments.elements();
            if (elements) {
                var count = elements.count();
                for (var i = 1; i <= count; i++) {
                    var finalizedAttachment = elements.item(i);
                    var isApproved = finalizedAttachment.getQualifiedAttribute("customAttributes.isApproved");
                    var draftToFinalize = finalizedAttachment.getQualifiedAttribute("customAttributes.draftToFinalize");

                    //check if it's approved or not
                    if (!isApproved) {
                        if (draftToFinalize) {
                            if (DEBUG) {
                                wom.log(DEBUG_PREFIX + "got doc for finalization... " + draftToFinalize);
                            }

                            finalizedAttachment.setQualifiedAttribute("customAttributes.finalVersion", draftToFinalize);
                            if (DEBUG) {
                                wom.log(DEBUG_PREFIX + "set finalized attachment to final version... ");
                            }
                            var finalVersion = finalizedAttachment.getQualifiedAttribute("customAttributes.finalVersion");
                            var draftToFinalizeURL = draftToFinalize.targetUrl;
                            if (DEBUG) {
                                wom.log(DEBUG_PREFIX + "final draft url... " + draftToFinalizeURL);
                            }

                            //convert doc to pdf 
                            var finalVersionPDF = DocumentUtils.ConvertToPdf(draftToFinalizeURL);
                            if (DEBUG) {
                                wom.log(DEBUG_PREFIX + "turn final doc to pdf " + finalVersionPDF);
                            }

                            /////add watermark to doc/////
                            var watermarkText = createWaterMark();
                            var finalDocStamped = DocumentUtils.AddStamp(finalVersionPDF, 0, watermarkText, "right", "top", 20, 0, 10, 1, 100, -5, -5, false);
                            if (DEBUG) {
                                wom.log(DEBUG_PREFIX + "stamped pdf with watermark... " + finalDocStamped);
                            }

                            //set final stamped pdf and finalized date to final Version 
                            finalVersion.setQualifiedAttribute("targetUrl", finalDocStamped);
                            var date = new Date();
                            finalVersion.setQualifiedAttribute("dateModified", date);
                            finalizedAttachment.setQualifiedAttribute("customAttributes.isApproved", true);
                        }
                    }
                }
            }
        }

 		function createWaterMark() {
            try {
                var loggedForEntity = wom.getEntityFromString(sch.getQueryString("LoggedFor"));
                var watermarkText = "Approved by University of Georgia\n";
                watermarkText += "Institutional Review Board\n";
                watermarkText += "Project ID " + loggedForEntity.ID + "\n";

                var dateEffective = new Date();
                if (targetEntity.type == "_IRBSubmission") {
                    dateEffective = loggedForEntity.getQualifiedAttribute("customAttributes.dateEffective");
                }

                if (targetEntity.type == "_Submission") {
                    dateEffective = loggedForEntity.getQualifiedAttribute("customAttributes.criticalEffectiveDate");
                }

                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + "date effective " + dateEffective);
                }
                var EffectiveDate = new Date(dateEffective);
                if (dateEffective != null) {
                    var strEffectiveDate = (EffectiveDate.getMonth() + 1) + "/" + EffectiveDate.getDate() + "/" + EffectiveDate.getFullYear();
                } else {
                    var strEffectiveDate = null;
                }
                watermarkText += "Approved on: " + strEffectiveDate + "\n";

                /*
                var dateExpiration = new Date();
                dateExpiration = loggedForEntity.getQualifiedAttribute("customAttributes.criticalExpirationDate");
                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + "date effective " + dateExpiration);
                }
                var ExpirationDate = new Date(dateExpiration);
                if (dateExpiration != null) {
                    var strExpirationDate = (ExpirationDate.getMonth() + 1) + "/" + ExpirationDate.getDate() + "/" + ExpirationDate.getFullYear();
                } else {
                    var strExpirationDate = null;
                }
                watermarkText += "For use through: " + strExpirationDate;
                */

                return watermarkText;

            } catch (e) {
                wom.log(DEBUG_PREFIX + "ERROR: " + e.description);
                throw e;
            }
        }

        if (DEBUG) {
            wom.log(DEBUG_PREFIX + "Finalization Complete");
        }
    } catch (e) {
        wom.log(DEBUG_PREFIX + "ERROR: " + e.description);
        throw e;
    }
}