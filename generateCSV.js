    
/** 
* @author : css
* @description : Called from a pre-processing script on an activity in the uga_Utility project, this
method queries db to retrieve data, return an xml object, and finally
populate cells in spreadsheet with the data.
* @param {string} month 
* @param {string} year 
**/

function uga_generatePS_CSV(month, year) {
    try {
        var DEBUG = false;
        var DEBUG_PREFIX = "(uga_generatePS_CSV)[uga_Utility Activity]: ";
        if (DEBUG) wom.log(DEBUG_PREFIX + "STARTING...");

        //assertions check 
        Assert.NotNull(month, "a null value for month is not valid");
        Assert.NotNull(year, "a null value for year is not valid");
        if (DEBUG) wom.log(DEBUG_PREFIX + "Month : " + month + " -- Year : " + year);
        var monthNum = month;

        var parseXml;
        parseXml = function (xmlStr) {
            var xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
            xmlDoc.async = "false";
            xmlDoc.loadXML(xmlStr);
            return xmlDoc;
        };

        switch (month) {
		    case "January":
		        monthNum = 1;
		        break;
		    case "February":
		        monthNum = 2;
		        break;
		    case "March":
		        monthNum = 3;
		        break;
		    case "April":
		        monthNum = 4;
		        break;
		    case "May":
		        monthNum = 5;
		        break;
		    case "June":
		        monthNum = 6;
		        break;
		    case "July":
		        monthNum = 7;
		        break;
		    case "August":
		        monthNum = 8;
		        break;
		    case "September":
		        monthNum = 9;
		        break;
		    case "October":
		        monthNum = 10;
		        break;
		    case "November":
		        monthNum = 11;
		        break;
		    case "December":
		        monthNum = 12;
		        break;
		}

        var sql = "SELECT * FROM [ANOPS].[dbo].[uga_ps_csv] WHERE month_number = " + month + " AND year_number = " + year;
        Assert.NotNull(sql, "a null value for sql is not valid");
        //returns xml of result
        var retRes = EntityUtils.ExecuteSqlWithResults(sql);
        Assert.NotNull(retRes, "retRes is null");
        var uga_ps_xml = parseXml(retRes);
        Assert.NotNull(uga_ps_xml, "uga_ps_xml is null");
        var nodeRecord = uga_ps_xml.getElementsByTagName("record");

        //make sure records exist
        Assert.True(nodeRecord.length > 0, "No records exist for this time period.");
        //setup excel
        var INVOICE_SPREADSHEET_TEMPLATE_ID = "uga_psToCSV";
        var STARTING_CELL_ID = "POs with formula!A2";
        var excelMerge = _ExcelMerge.newExcelMerge(INVOICE_SPREADSHEET_TEMPLATE_ID);

        var excelDocumentName = "Invoice Spreadsheet for " + month + " / " + year;
        if (DEBUG) wom.log(DEBUG_PREFIX + "Excel finished setting up...");

        //update excelValudes2DArray
        constructArray().toString();

        if (DEBUG) wom.log(DEBUG_PREFIX + "Merging with Excel...");
        excelMerge.add2DArray(excelValues2DArray, STARTING_CELL_ID);
        if (DEBUG) wom.log(DEBUG_PREFIX + "Creating new document...");
        var doc = excelMerge.mergeAsNewDocument(excelDocumentName);
        if (DEBUG) wom.log(DEBUG_PREFIX + "doc... " + doc);
        if (DEBUG) wom.log(DEBUG_PREFIX + "Storing new document...");

        var invoice_csv = ApplicationEntity.getResultSet("_uga_Invoice").elements().item(1);
        var ugaUtil = ApplicationEntity.getResultSet("_uga_Utility").elements();

        if (ugaUtil) {
            var count = ugaUtil.count();
            for (i = 1; i <= count; i++) {
                ugaUtil.item(i).setQualifiedAttribute("customAttributes.uga_csv_set", doc, "add");
                ugaUtil.item(i).setQualifiedAttribute("customAttributes.uga_csv_set1", doc);
            }
        }
        invoice_csv.setQualifiedAttribute("customAttributes.uga_csv_set", doc, "add");

        //construct the array
        function constructArray() {
            try {
                if (nodeRecord) {
                    for (var i = 0; i < nodeRecord.length; i++) {
                        var nodeField = nodeRecord[i].childNodes;
                        var unit = "18000",
                            ledger = "ACTUALS",
                            account, fund, deptID, program, class_id, budgetReference, baseAmount, project, projectUnit, activity, description;
                        for (var j = 0; j < nodeField.length; j++) {
                            if (nodeField[j].getAttribute('fieldName') == "[gL_Account]") {
                                account = nodeField[j].getAttribute('fieldValue');
                            }
                            if (nodeField[j].getAttribute('fieldName') == "[fund_Code]") {
                                fund = nodeField[j].getAttribute('fieldValue');
                            }
                            if (nodeField[j].getAttribute('fieldName') == "[dept_ID]") {
                                deptID = nodeField[j].getAttribute('fieldValue');
                            }
                            if (nodeField[j].getAttribute('fieldName') == "[program_Code]") {
                                program = nodeField[j].getAttribute('fieldValue');
                            }
                            if (nodeField[j].getAttribute('fieldName') == "[class_ID]") {
                                class_id = nodeField[j].getAttribute('fieldValue');
                            }
                            if (nodeField[j].getAttribute('fieldName') == "[budget_Ref]") {
                                budgetReference = nodeField[j].getAttribute('fieldValue');
                            }
                            if (nodeField[j].getAttribute('fieldName') == "[uga_total]") {
                                baseAmount = nodeField[j].getAttribute('fieldValue');
                            }
                            if (nodeField[j].getAttribute('fieldName') == "[project_ID]") {
                                project = nodeField[j].getAttribute('fieldValue');
                            }
                            if (nodeField[j].getAttribute('fieldName') == "[project_Business_Unit_ID]") {
                                projectUnit = nodeField[j].getAttribute('fieldValue');
                            }
                            if (nodeField[j].getAttribute('fieldName') == "[project_Activity_ID]") {
                                activity = nodeField[j].getAttribute('fieldValue');
                            }
                            if (nodeField[j].getAttribute('fieldName') == "[description]") {
                                description = nodeField[j].getAttribute('fieldValue');
                            }
                        }
                        var dataArray = new Array(unit, ledger, account, fund, deptID, program, class_id, budgetReference, baseAmount, project, projectUnit, activity, description);
                        excelValues2DArray.push(dataArray)
                    }
                }
                if (DEBUG) wom.log(DEBUG_PREFIX + "Array created...");
                return excelValues2DArray;

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