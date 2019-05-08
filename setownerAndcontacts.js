/** 
 * @description : Called from the global post-processing script on the state transitions of projects. The script executes
 * on every state transtion for all projects, setting the owner and contacts 
 * @param {entity}  targetEntity 
 **/
function uga_setOwnersAndContacts(targetEntity) {
    try {
        var DEBUG = true;
        var DEBUG_PREFIX = "DEBUG [CustomUtils](uga_setOwnersAndContacts): ";
        if (DEBUG) {
            wom.log(DEBUG_PREFIX + "STARTING");
        }

        //assertions check
        //first make sure we are dealing with a fully formed entity
        Assert.NotNull(targetEntity, 'target entity cannot be null');
        Assert.Entity(targetEntity, "this is not a valid entity or project");
        wom.log(targetEntity);

        //find out the project type
        //returns a string 
        var type = targetEntity.getEntityTypeName();
        if (DEBUG) {
            wom.log(DEBUG_PREFIX + " TYPE: " + type);
        }

        targetEntity.setQualifiedAttribute("contacts", null);
        if (DEBUG) {
            wom.log(DEBUG_PREFIX + "contacts cleared");
        }

        /*
        Types will be:
            1. _uga_order_import
            2. _uga_export 
            3. _Service Request
            4. _uga_account_transfer
            5  _uga_piToPi_transfer 
            6. _uga_AUP_perDiem_transfer
            7. _uga_Invoice
            8. _uga_transport 
        */

        //get project status
        var statusID = targetEntity.getQualifiedAttribute("status.ID");
        if (DEBUG) {
            wom.log(DEBUG_PREFIX + " GOT statusID: " + statusID);
        }

        //do not move or change variable  
        var contactsSet = newContactsSet();
        //get the common roles
        var userRole = ApplicationEntity.getResultSet("UserRole");
        var person = ApplicationEntity.getResultSet("Person");

        var aocRole = userRole.query("ID = 'Animal Order Coordinator'").elements()(1);
        var vetsRole = userRole.query("ID = 'Veterinarian'").elements()(1);
        var vettechsRole = userRole.query("ID = 'Veterinary Technician'").elements()(1);

        var URARBS = person.query("roles.*.ID = 'URAR Business Specialist'");
        var ATC = person.query("roles.*.ID = 'Animal Transportation Coordinator'");
        var AOCS = person.query("roles.* = " + aocRole);
        var VETS = person.query("roles.* = " + vetsRole);
        var VETTECHS = person.query("roles.* = " + vettechsRole);
        var INITIATOR = targetEntity.getQualifiedAttribute("createdBy");

        switch (type) {
            case "_uga_order_import":
                isUGAOrderImport();
                break;
            case "_uga_export":
                isUGAExport();
                break;
            case "_uga_service_request":
                isServiceRequest();
                break;
            case "_uga_account_transfer":
                isUGAAcctTransfer();
                break;
            case "_uga_piToPi_transfer":
                isUGAPiToPiTransfer()
                break;
            case "_uga_AUP_perDiem_transfer":
                isUGAAUPPerDiemTransfer();
                break;
            case "_uga_Invoice":
                isUGAInvoice();
                break;
            case "_uga_transport":
                isUGATransport();
                break;
        }

        //#region uga_order_import
        function isUGAOrderImport() {
            try {
                //Check if hazards are being used
                //Check if USDA species used
                var hazards = false;
                var USDAspecies = false;

                var orderLineItems = targetEntity.getQualifiedAttribute("customAttributes.orderLineItems")
                if (orderLineItems) {
                    var elements = orderLineItems.elements();
                    var count = elements.count();
                    var FACMGRS = Person.createEntitySet();
                    for (i = 1; i <= count; i++) {
                        var itemHazards = elements.item(i).getQualifiedAttribute("customAttributes.hazardsBeingUsedOnAnimals");
                        if (itemHazards) {
                            hazards = true;
                        }
                        var usda = elements.item(i).getQualifiedAttribute("customAttributes.animalGroupForLineItem.customAttributes.artemis_USDA_flag");
                        if (usda) {
                            USDAspecies = true;
                        }
                        var LI_FACMGRS = elements.item(i).getQualifiedAttribute("customAttributes.requestedHousingLocation.customAttributes.uga_SuiteName.customAttributes.ugaSuiteSupervisors");
                        if (DEBUG) {
                            wom.log(DEBUG_PREFIX + "Facility Manager" + LI_FACMGRS);
                        }
                        if (LI_FACMGRS) {
                            FACMGRS.addAll(LI_FACMGRS);
                        }
                    }
                }

                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + "hazards/USDAspecies in ugaOrder: " + hazards + ", " + USDAspecies + ", " + FACMGRS);
                }

                var PI = targetEntity.getQualifiedAttribute("customAttributes.sourceProtocol.customAttributes._attribute7");
                var BUSMGR = targetEntity.getQualifiedAttribute("customAttributes.businessManager");

                //Set defaults
                addItemToSet(INITIATOR);

                switch (statusID) {
                    case "Draft":
                        addToSet(AOCS);
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                    case "Financial Approval":
                        setOwner(BUSMGR);
                        addItemToSet(PI);
                        addToSet(AOCS);
                        break;
                    case "Pending Approval of Assigned Space":
                        addToSet(FACMGRS);
                        addToSet(AOCS);
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                    case "Pending Approval of Final Housing Location":
                        addItemToSet(BUSMGR);
                        addToSet(FACMGRS);
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                    case "Pending Submission to Vendor":
                        addItemToSet(BUSMGR);
                        addToSet(AOCS);
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                    case "Pending Receipt of Animal Import":
                        addToSet(FACMGRS);
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                }
                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + "isUgaOrderImport complete");
                }

            } catch (e) {
                wom.log(DEBUG_PREFIX + "ERROR: " + e.description);
                throw e;
            }
        }

        //#region uga export
        function isUGAExport() {
            try {
                //Check if hazards are being used
                //Check if USDA species used
                var hazards = false;
                var USDAspecies = false;

                //Get orderLineItem
                var cards = targetEntity.getQualifiedAttribute("customAttributes.exportCageCards");
                if (cards) {
                    var elements = cards.elements();
                    var count = elements.count();
                    for (i = 1; i <= count; i++) {
                        var orderLineItem = elements.item(i).getQualifiedAttribute("customAttributes.uga_orderLineItem");
                        if (orderLineItem) {
                            var itemHazards = orderLineItem.getQualifiedAttribute("customAttributes.hazardsBeingUsedOnAnimals");
                            if (itemHazards) {
                                hazards = true;
                            }
                            var usda = orderLineItem.getQualifiedAttribute("customAttributes.animalGroupForLineItem.customAttributes.artemis_USDA_flag");
                            if (usda) {
                                USDAspecies = true;
                            }
                        }
                    }
                }

                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + "hazards/USDAspecies in ugaExport: " + hazards + ", " + USDAspecies);
                }

                var PI = targetEntity.getQualifiedAttribute("customAttributes.sourceProtocol.customAttributes._attribute7");

                //Set defaults

                addItemToSet(INITIATOR);

                switch (statusID) {
                    case "Draft":
                        addToSet(AOCS);
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                    case "Attach Health Records":
                        addToSet(VETS);
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                    case "Send Health Documentation":
                        addToSet(URARBS);
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                    case "Schedule Shipping":
                        addToSet(URARBS);
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                    case "Welfare Check":
                        addToSet(VETS)
                        addToSet(VETTECHS);
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                    case "Awaiting Approval for Shipping":
                        addToSet(VETTECHS);
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                    case "Export Issue":
                        addToSet(VETS);
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                    case "Awaiting Reconciliation ":
                        addToSet(URARBS);
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                }

                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + "isUgaExport complete");
                }

            } catch (e) {
                wom.log(DEBUG_PREFIX + "ERROR: " + e.description);
                throw e;
            }
        }

        //#region ServiceRequest
        function isServiceRequest() {
            try {
                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + "Executing isServiceRequest");
                }
                var PI = targetEntity.getQualifiedAttribute("customAttributes.pi");

                //Set defaults
                addItemToSet(INITIATOR);

                switch (statusID) {
                    case "Draft":
                        addToSet(AOCS);
                        setOwner(PI);
                        break;
                    case "Service Request Fiscal Review":
                        addToSet(AOCS);
                        setOwner(PI);
                        break;
                    case "Awaiting Ownership":
                        addToSet(VETTECHS);
                        setOwner(PI);
                        break;
                    case "Business Specialist Review":
                        addToSet(URARBS);
                        setOwner(PI);
                        break;
                }
                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + "isServiceRequest complete");
                }

            } catch (e) {
                wom.log(DEBUG_PREFIX + "ERROR: " + e.description);
                throw e;
            }
        }

        //#region AccountTransfer
        function isUGAAcctTransfer() {
            try {
                //Check if hazards are being used
                //Check if USDA species used
                var check = hazardsUSDACheck();
                var hazards = check[0];
                var USDAspecies = check[1];

                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + "hazards/USDAspecies in ugaAcctChange: " + hazards + ", " + USDAspecies);
                }

                var PI = targetEntity.getQualifiedAttribute("customAttributes.sourceProtocol.customAttributes._attribute7");
                var BUSMGR = targetEntity.getQualifiedAttribute("customAttributes.businessManager");

                //Set defaults

                addItemToSet(INITIATOR);

                switch (statusID) {
                    case "Draft":
                        addToSet(AOCS);
                        setOwner(PI);
                        break;
                    case "Business Manager Review":
                        addItemToSet(BUSMGR);
                        setOwner(PI);
                        break;
                }
                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + "isUGAAcctTransfer complete");
                }

            } catch (e) {
                wom.log(DEBUG_PREFIX + "ERROR: " + e.description);
                throw e;
            }
        }

        //#region PITransfer
        function isUGAPiToPiTransfer() {
            try {
                //Check if hazards are being used
                //Check if USDA species used
                var check = hazardsUSDACheck();
                var hazards = check[0];
                var USDAspecies = check[1];

                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + "hazards/USDAspecies in ugaPiChange: " + hazards + ", " + USDAspecies);
                }

                var PI = targetEntity.getQualifiedAttribute("customAttributes.sourceProtocol.customAttributes._attribute7");
                wom.log("THIS IS THE PI" + PI);
                var BUSMGR = targetEntity.getQualifiedAttribute("customAttributes.receivingBusinessManager");
                var RECVPI = targetEntity.getQualifiedAttribute("customAttributes.receivingPI");
                wom.log("THIS IS THE REC PI" + RECVPI);
                var FACMGRS = Person.createEntitySet();
                var transferFacility = targetEntity.getQualifiedAttribute("customAttributes.transferToFacility");
                wom.log("THIS IS The tranfer facility" + transferFacility);
                if (transferFacility) {
                    var supervisors = transferFacility.getQualifiedAttribute("customAttributes.uga_SuiteName.customAttributes.ugaSuiteSupervisors");
                    if (DEBUG) {
                        wom.log(DEBUG_PREFIX + "got the supervisors..." + supervisors);
                    }
                    FACMGRS.addAll(supervisors)
                }


                //Set defaults

                addItemToSet(INITIATOR);

                switch (statusID) {
                    case "Draft":
                        addItemToSet(RECVPI);
                        addToSet(AOCS);
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                    case "Receiving PI Review":
                        setOwner(RECVPI);
                        addItemToSet(PI);
                        addToSet(AOCS);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                    case "Business Manager Review":
                        addItemToSet(BUSMGR);
                        addItemToSet(RECVPI);
                        addToSet(AOCS);
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                    case "Veterinarian Review":
                        addItemToSet(RECVPI);
                        addToSet(AOCS);
                        addToSet(VETS);
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                    case "Target Facility Supervisor Review":
                        addToSet(FACMGRS);
                        wom.log("end facility managers");
                        addItemToSet(RECVPI);
                        addToSet(AOCS);
                        addToSet(VETS);
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                    case "Request Denied":
                        addItemToSet(RECVPI);
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                }
                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + "isUGAPiToPiTransfer complete");
                }

            } catch (e) {
                wom.log(DEBUG_PREFIX + "ERROR: " + e.description);
                throw e;
            }
        }

        //#region AUPTransfer
        function isUGAAUPPerDiemTransfer() {
            try {
                //Check if hazards are being used
                //Check if USDA species used
                var check = hazardsUSDACheck();
                var hazards = check[0];
                var USDAspecies = check[1];

                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + "hazards/USDAspecies in ugaChangeProtocol: " + hazards + ", " + USDAspecies);
                }
                var PI = targetEntity.getQualifiedAttribute("customAttributes.sourceProtocol.customAttributes._attribute7");
                var BUSMGR = targetEntity.getQualifiedAttribute("customAttributes.businessManager");
                var RECFAC = targetEntity.getQualifiedAttribute("customAttributes.targetFacility.customAttributes.uga_SuiteName.customAttributes.ugaSuiteSupervisors");
                var CURFAC = targetEntity.getQualifiedAttribute("customAttributes.transferCageCards.customAttributes.facility.customAttributes.uga_SuiteName.customAttributes.ugaSuiteSupervisors");

                //Set defaults

                addItemToSet(INITIATOR);

                switch (statusID) {
                    case "Draft":
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                    case "Business Manager Review":
                        setOwner(PI);
                        addItemToSet(BUSMGR);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                    case "Facility Supervisor Review":
                        setOwner(PI);
                        addToSet(CURFAC);
                        break;
                    case "Veterinarian Review":
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                    case "Financial Approval":
                        setOwner(PI);
                        addToSet(RECFAC);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                    case "Approved - Pending Transport":
                        setOwner(PI);
                        addToSet(CURFAC);
                        addToSet(RECFAC);
                        addToSet(ATC);
                        break;
                }

                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + "isUGAAUPPerDiemTransfer complete");
                }

            } catch (e) {
                wom.log(DEBUG_PREFIX + "ERROR: " + e.description);
                throw e;
            }
        }

        //#region _uga_Invoice
        function isUGAInvoice() {
            try {
                var PI = targetEntity.getQualifiedAttribute("customAttributes.uga_pi");
                //defaults
                addItemToSet(INITIATOR);

                switch (statusID) {
                    case "PI Review":
                        setOwner(PI);
                        break;
                    case "Approved":
                        setOwner(PI);
                        break;
                    default:
                        setOwner(PI);
                }
                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + "isUGAInvoice complete");
                }

            } catch (e) {
                wom.log(DEBUG_PREFIX + "ERROR: " + e.description);
                throw e;
            }
        }

        //#region _uga_transport
        function isUGATransport() {
            try {
                //Check if hazards are being used
                //Check if USDA species used
                var hazards = false;
                var USDAspecies = false;

                //Get orderLineItem
                var cards = targetEntity.getQualifiedAttribute("customAttributes.transportCageCards");
                if (cards) {
                    var elements = cards.elements();
                    var count = elements.count();
                    for (i = 1; i <= count; i++) {
                        var orderLineItem = elements.item(i).getQualifiedAttribute("customAttributes.uga_orderLineItem");
                        if (orderLineItem) {
                            var itemHazards = orderLineItem.getQualifiedAttribute("customAttributes.hazardsBeingUsedOnAnimals");
                            if (itemHazards) {
                                hazards = true;
                            }
                            var usda = orderLineItem.getQualifiedAttribute("customAttributes.animalGroupForLineItem.customAttributes.artemis_USDA_flag");
                            if (usda) {
                                USDAspecies = true;
                            }
                        }
                    }
                }

                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + "hazards/USDAspecies in ugaTransport: " + hazards + ", " + USDAspecies);
                }

                var PI = targetEntity.getQualifiedAttribute("customAttributes.sourceProtocol.customAttributes._attribute7");
                var BUSMGR = targetEntity.getQualifiedAttribute("customAttributes.businessManager");
                var RECFAC = targetEntity.getQualifiedAttribute("customAttributes.targetFacility.customAttributes.uga_SuiteName.customAttributes.ugaSuiteSupervisors");
                var CURFAC = Person.createEntitySet();

                //set defaults 

                addItemToSet(INITIATOR);

                switch (statusID) {
                    case "Business Manager Review":
                        addItemToSet(BUSMGR);
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                    case "Veterinarian Review":
                        addToSet(VETS);
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                    case "Receiving Facility Supervisor Review":
                        addToSet(RECFAC);
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                    case "Source Facility Supervisor Review":
                        addToSet(CURFAC);
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                    case "Approved - Pending Transport":
                        addToSet(RECFAC);
                        addToSet(CURFAC);
                        addToSet(ATC);
                        setOwner(PI);
                        ruleAdd(VETS, hazards);
                        ruleAdd(VETTECHS, USDAspecies);
                        break;
                }
                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + "isUGATransport complete");
                }

            } catch (e) {
                wom.log(DEBUG_PREFIX + "ERROR: " + e.description);
                throw e;
            }
        }

        //Set contacts on targetEntity
        targetEntity.setQualifiedAttribute("contacts", contactsSet);

        //#region helperFunctions
        function hazardsUSDACheck() {
            try {
                //Check if hazards are being used
                //Check if USDA species used
                var check = [];
                var hazards = false;
                var USDAspecies = false;

                //Get orderLineItem
                var cards = targetEntity.getQualifiedAttribute("customAttributes.transferCageCards");

                if (cards) {
                    var elements = cards.elements();
                    var count = elements.count();
                    for (i = 1; i <= count; i++) {
                        var orderLineItem = elements.item(i).getQualifiedAttribute("customAttributes.uga_orderLineItem");
                        if (orderLineItem) {
                            var itemHazards = orderLineItem.getQualifiedAttribute("customAttributes.hazardsBeingUsedOnAnimals");
                            if (itemHazards) {
                                hazards = true;
                            }
                            var usda = orderLineItem.getQualifiedAttribute("customAttributes.animalGroupForLineItem.customAttributes.artemis_USDA_flag");
                            if (usda) {
                                USDAspecies = true;
                            }
                        }
                    }
                }

                check.push(hazards, USDAspecies);
                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + "check in hazardsCheck: " + check);
                    wom.log(DEBUG_PREFIX + "hazards check complete");
                }
                return check;

            } catch (e) {
                wom.log(DEBUG_PREFIX + "ERROR: " + e.description);
                throw e;
            }
        }

        function setOwner(person) {
            if (person) {
                targetEntity.setQualifiedAttribute("owner", person);
                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + person + ": owner set.");
                }
            }
        }

        function newContactsSet() {
            var contactsSet = Person.createEntitySet();
            if (DEBUG) {
                wom.log(DEBUG_PREFIX + "new contacts set");
            }
            return contactsSet;
        }

        function addToSet(people) {
            if (people) {
                contactsSet.addAll(people);
                if (DEBUG) {
                    var elements = people.elements();
                    var count = elements.count();
                    for (var i = 1; i <= count; i++) {
                        wom.log(DEBUG_PREFIX + elements(i).lastName + ": added to set")
                    }
                }

            }
        }

        function addItemToSet(person) {
            if (person) {
                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + person.lastName + ": added item to set....");
                }
                contactsSet.addElement(person);
            }
        }

        function ruleAdd(people, rule) {
            if (rule) {
                if (people) {
                    contactsSet.addAll(people);
                    if (DEBUG) {
                        wom.log(DEBUG_PREFIX + people + ": added people based on rule.");
                    }
                }
            }
        }

        if (DEBUG) {
            wom.log(DEBUG_PREFIX + "contacts set on target entity");
        }

    } catch (e) {
        wom.log(DEBUG_PREFIX + "ERROR: " + e.description);
        throw e;
    }
}