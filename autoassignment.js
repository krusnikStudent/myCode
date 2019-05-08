/** 
 *@author css
 *@description : Called on Activities (Submit, Submit Pre-Review) on the _Submission project.
 *When a Submission is moved from Draft into HSO, this script runs to auto-assign the owner. 
 *The owner is the HSO staff responsible for the review and administration of the Submission.  
 *Auto-assignment is load balanced, meaning if a submission goes to IRB Coordinator Is, 
 *this process checks the current number of active submissions for each person with this role 
 *and assigns the submission to the person with the fewer active submissions. 
 **/
function autoAssignment() {
    try {
        var DEBUG = true;
        var DEBUG_PREFIX = "DEBUG [SUBMISSION](autoAssignment): ";

        if (DEBUG) {
            wom.log(DEBUG_PREFIX + "STARTING...")
        }

        /* 1. Pre-Reviewers are IRB staff. The auto-assign is by type of submission as determined by properties in the submission: 
                Study Scope Page, Q2:
                Project is Exempt - IRB Coord I
                Commitee Review:
                    DXA/X-ray - IRB Committee Admin
                    More than moderate Exercise - IRB Committee Admin
                    Clinical Trial - IRB Committee Admin
                All others to IRB Coord II
            2. External IRB Requests – IRB Director
            3. NHSR – IRB Director
            4. Developmental – IRB Director
 
            IRB Coordinator II
            IRB Director
            IRB Coordinator
            IRB Administrator
            Post Approval Monitor (PAM) for progress reports 
        */

        var project = this;
        var PI = project.getQualifiedAttribute("customAttributes.principalInvestigator");
        wom.log(DEBUG_PREFIX + "The PI is " + PI.lastName);
        var owner = project.getQualifiedAttribute("owner");
        //check for null owner and assign 
        if (owner) {
            wom.log(DEBUG_PREFIX + "The owner is " + owner.lastName);
        }

        var extIRBReq = project.getQualifiedAttribute("customAttributes.requestingExternalIRB");
        var NHSR = project.getQualifiedAttribute("customAttributes.requestingNHSR");
        var developmental = project.getQualifiedAttribute("customAttributes.requestingDevelopmental");
        if (DEBUG) {
            wom.log(DEBUG_PREFIX + "The project is " + project.ID);
            wom.log(DEBUG_PREFIX + "External IRB Req is " + extIRBReq);
            wom.log(DEBUG_PREFIX + "NHSR " + NHSR);
            wom.log(DEBUG_PREFIX + "Developmental is " + developmental);
        }

        // Get the roles for assignment 
        var person = ApplicationEntity.getResultSet("Person");
        var irbDir = person.query("roles.*.ID in {'IRB Director'}");
        var irbCoordI = person.query("roles.*.ID = 'IRB Coordinator I'");
        var irbCoordII = person.query("roles.*.ID = 'IRB Coordinator II'");
        var irbAdmin = person.query("roles.*.ID = 'IRB Administrator'");
        //var irbPAM = person.query("roles.*.ID = 'Post Approval Monitor'");

        var correctStudyRole = null;

        if (!DEBUG) {
            wom.log(DEBUG_PREFIX + "irbDir..." + irbDir);
            wom.log(DEBUG_PREFIX + "irbCoordI..." + irbCoordI);
            wom.log(DEBUG_PREFIX + "irbCoordII..." + irbCoordII);
            wom.log(DEBUG_PREFIX + "irbAdmin..." + irbAdmin);
            //wom.log(DEBUG_PREFIX + "irbPAM..." + irbPAM);
        }

        wom.log(DEBUG_PREFIX + "Got Submission Roles...");

        /*
        Update css 2/12/2019 completed in pr_autoAssignment in _ProgressReports
        //Progress Report is auto assigned to any HSO staff with PAM Role
        //Needs to be load balanced
        var prEnabled = project.getQualifiedAttribute("customAttributes.progressReportEnabled");
        if (prEnabled) {
            var prReports = project.getQualifiedAttribute("customAttributes.progressReportsMadeFromSubmission");
            if (prReports) {
                var prEl = prReports.elements();
                if (prEl) {
                    var prCt = prEl.count();
                    if (prCt > 0) {
                        for (var p = 1; p <= prCt; p++) {
                            var prStatus = prEl(p).getQualifiedAttribute("status.ID");
                            wom.log(DEBUG_PREFIX + "Progress Report Status is " + prStatus);
                            wom.log(DEBUG_PREFIX + "progress report: " + prEl(p).ID);
                            var prAssignment = assignRoleToPAM(irbPAM, prEl(p));
                        }
                    }
                }
            }
        }
        */

        //Methods Requiring Attention
        var methodsReqAtt = project.getQualifiedAttribute("customAttributes.methodsRequiringAttention");
        var exempt = null;
        var DXA = null;
        var clinicalTrials = null;
        var modExercise = null;

        if (methodsReqAtt) {
            var elements = methodsReqAtt.elements();
            if (elements) {
                var count = elements.count();
                if (count > 0) {
                    for (var i = 1; i <= count; i++) {
                        var methods = elements(i);
                        var methodValues = methods.getQualifiedAttribute("customAttributes.value");
                        switch (methodValues) {
                            case "Project is Exempt":
                                exempt = methods;
                                break;
                            case "DXA/X-Ray":
                                DXA = methods;
                                break;
                            case "ClinicalTrials.gov Registration":
                                clinicalTrials = methods;
                                break;
                            case "More than moderate Exercise ":
                                modExercise = methods;
                                break;
                            default:
                                wom.log(DEBUG_PREFIX + "could not assign method");
                        }
                        var active = methods.getQualifiedAttribute("customAttributes.active");
                        if (!DEBUG) {
                            wom.log(DEBUG_PREFIX + methods + methodValues + " is " + active);
                        }
                    }
                }
            }
        }

        if (DEBUG) {
            wom.log(DEBUG_PREFIX + "Exempt..." + exempt);
            wom.log(DEBUG_PREFIX + "DXA..." + DXA);
            wom.log(DEBUG_PREFIX + "clinical trials..." + clinicalTrials);
            wom.log(DEBUG_PREFIX + "modExercise..." + modExercise);
        }

        // Start assignment block
        // 1. assign the IRB Director roles
        if (extIRBReq == true || NHSR == true || developmental == true) {
            //check that irb director roles exist
            var irbDirCount = irbDir.elements().count();
            if (DEBUG) {
                wom.log(DEBUG_PREFIX + "IRB Director Count = " + irbDirCount)
            }
            if (irbDirCount == 0) {
                throw (new Error("Zero people found with IRB Director role.  Please contact the IRB Office."));
            }
            correctStudyRole = irbDir;
            var assignment = assignRoleTo(correctStudyRole);

            // 2. assign the irb coord 1 roles
        } else if (exempt) {
            if (DEBUG) {
                wom.log(DEBUG_PREFIX + "Assigning to IRB Coord I");
            }
            correctStudyRole = irbCoordI;
            var assignment = assignRoleTo(correctStudyRole);

            //3. assign irb admind roles       
        } else if (DXA || clinicalTrials || modExercise) {
            if (DEBUG) {
                wom.log(DEBUG_PREFIX + "Assigning to IRB Admin");
            }
            correctStudyRole = irbAdmin;
            var assignment = assignRoleTo(correctStudyRole);

            //4. assign the rest to irb coord 2 roles    
        } else if (correctStudyRole == null) {
            if (DEBUG) {
                wom.log(DEBUG_PREFIX + "Assigning others to IRB Coord II");
            }
            correctStudyRole = irbCoordII;
            var assignment = assignRoleTo(correctStudyRole);
        } else {
            if (DEBUG) {
                wom.log(DEBUG_PREFIX + "No correct role found for study");
            }
        }

        // helper functions block 
        // assign owner to correct role  
        function assignRoleTo(correctStudyRole) {
            try {
                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + "executing assignRoleTo function")
                }
                var assignedOwner = validateCurrentOwner(correctStudyRole, owner);
                if (assignedOwner) {
                    this.setQualifiedAttribute("owner", assignedOwner);
                    if (DEBUG) {
                        wom.log(DEBUG_PREFIX + "Assigned owner is " + assignedOwner.lastName);
                    }
                }
            } catch (e) {
                wom.log(DEBUG_PREFIX + "ERROR: " + e.description);
                throw e;
            }
        }

        /*css 2/12/2019
        //assign progress reports to PAM
         function assignRoleToPAM(pamRole, progressReport) {
             try {
                 if (DEBUG) {
                     wom.log(DEBUG_PREFIX + "executing assignRoleToPAM function")
                 }
                 var prOwner = progressReport.getQualifiedAttribute("owner");
                 if (DEBUG) {
                     wom.log(DEBUG_PREFIX + "Progress report owner is " + prOwner.lastName);
                 }
                 var assignedOwner = validateCurrentOwner(pamRole, prOwner);
                 if (assignedOwner) {
                     progressReport.setQualifiedAttribute("owner", assignedOwner);
                     if (DEBUG) {
                         wom.log(DEBUG_PREFIX + "Assigned owner of Progress Report is " + assignedOwner.lastName);
                     }
                 }
             } catch (e) {
                 wom.log(DEBUG_PREFIX + "ERROR: " + e.description);
                 throw e;
             }
         }
         */

        // make sure owner is valid
        function validateCurrentOwner(correctStudyRole, owner) {
            try {
                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + "executing validateCurrentOwner function")
                }
                var validatedOwner = null;
                var correctStudyRoleEl = correctStudyRole.elements();
                if (correctStudyRoleEl) {
                    var correctStudyRoleCt = correctStudyRoleEl.count();
                    if (correctStudyRoleCt > 0) {
                        for (var k = 1; k <= correctStudyRoleCt; k++) {
                            if (DEBUG) {
                                wom.log(DEBUG_PREFIX + "Parsing through members of " + correctStudyRole + " to make sure current owner is present");
                            }
                            if (owner) {
                                if (DEBUG) {
                                    wom.log(DEBUG_PREFIX + "Member Name: " + correctStudyRoleEl(k).lastName);
                                }
                                if (owner == correctStudyRoleEl(k)) {
                                    if (DEBUG) {
                                        wom.log(DEBUG_PREFIX + "Current owner is " + correctStudyRoleEl(k).lastName + " and has proper role - keeping as owner");
                                    }
                                    validatedOwner = owner;
                                    return validatedOwner;
                                }
                            }
                        }
                    }
                }
                if (validatedOwner == null) {
                    if (DEBUG) {
                        wom.log(DEBUG_PREFIX + "Current owner absent in role group; moving to member with least submissions function");
                    }
                    validatedOwner = memberWithLeastSubs(correctStudyRole);
                }
                if (!DEBUG) {
                    wom.log(DEBUG_PREFIX + "The validatedOwner is: " + validatedOwner);
                }
                return validatedOwner;
            } catch (e) {
                wom.log(DEBUG_PREFIX + "ERROR: validateCurrentOwner " + e.description);
                throw e;
            }
        }

        //load balancing block; find member with fewest submissions
        function memberWithLeastSubs(correctStudyRole) {
            try {
                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + "executing memberWithLeastSubs function...");
                }
                if (correctStudyRole == irbCoordI) {
                    if (DEBUG) {
                        wom.log(DEBUG_PREFIX + "Correct role for study is IRB Coord 1");
                    }
                }
                if (correctStudyRole == irbCoordII) {
                    if (DEBUG) {
                        wom.log(DEBUG_PREFIX + "Correct role for study is IRB Coord 2");
                    }
                }
                if (correctStudyRole == irbAdmin) {
                    if (DEBUG) {
                        wom.log(DEBUG_PREFIX + "Correct role for study is IRB Admin");
                    }
                }
                if (correctStudyRole == irbDir) {
                    if (DEBUG) {
                        wom.log(DEBUG_PREFIX + "Correct role for study is IRB Director");
                    }
                }

                /*
                if (correctStudyRole == irbPAM) {
                    if (DEBUG) {
                        wom.log(DEBUG_PREFIX + "Correct role for study is PAM");
                    }
                }
                */

                var store = [];
                var selectedMember = null;
                var correctStudyRoleEl = correctStudyRole.elements();
                if (DEBUG) {
                    wom.log(DEBUG_PREFIX + "correct study role elements in memberWithLeastSubs " + correctStudyRoleEl);
                }
                if (correctStudyRoleEl) {
                    var correctStudyRoleCt = correctStudyRoleEl.count();
                    if (DEBUG) {
                        wom.log(DEBUG_PREFIX + "Number of users with this role = " + correctStudyRoleCt);
                    }
                    if (correctStudyRoleCt > 0) {
                        for (var j = 1; j <= correctStudyRoleCt; j++) {
                            var member = correctStudyRoleEl(j);
                            activeProjects = ApplicationEntity.getResultSet("_Submission").query("owner = " + member + "AND approved = True");
                            var actProjCt = activeProjects.count();
                            if (DEBUG) {
                                wom.log(DEBUG_PREFIX + "Member No# " + j + " with name = " + member.lastName + " and current project count= " + actProjCt);
                            }
                            var card = {
                                member: member,
                                actProjects: actProjCt
                            };
                            store.push(card);
                        }
                        storeStr = JSON.stringify(store, null, null);
                        if (DEBUG) {
                            wom.log(DEBUG_PREFIX + "The store with roles and respective active projects = " + storeStr);
                        }

                        selectedMember = getMember();

                        //helper functions to get member with fewest projects
                        function getMember() {
                            var matchMin = getMin();
                            var getMember;
                            for (var y = 0; y < store.length; y++) {
                                if (store[y].actProjects == matchMin) {
                                    getMember = store[y].member;
                                }
                            }
                            if (DEBUG) {
                                wom.log(DEBUG_PREFIX + "Got member... " + getMember.lastName);
                            }
                            return getMember;
                        }

                        function getMin() {
                            var findMin = [];
                            for (var x = 0; x < store.length; x++) {
                                findMin.push(store[x].actProjects);
                            }
                            var findMinStr = JSON.stringify(findMin, null, null);
                            if (DEBUG) {
                                wom.log(DEBUG_PREFIX + "findMin... " + findMinStr);
                            }
                            var minSubs = Math.min.apply(null, findMin);
                            if (DEBUG) {
                                wom.log(DEBUG_PREFIX + "Got min... " + minSubs);
                            }
                            return minSubs;
                        }
                    }
                } else {
                    wom.log(DEBUG_PREFIX + "There are are no members with this role...");
                }
                wom.log(DEBUG_PREFIX + "selected member is..." + selectedMember.lastName);
                return selectedMember;
            } catch (e) {
                wom.log(DEBUG_PREFIX + "ERROR: memberWithLeastSubs " + e.description);
                throw e;
            }
        }
    } catch (e) {
        wom.log(DEBUG_PREFIX + "ERROR: " + e.description);
        throw e;
    }
}
