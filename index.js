const dataSource = "https://jjcooley.ddns.net/lowellscheduledatabase/query/"
const sessionSource = "https://jjcooley.ddns.net/lowellscheduledatabase/session/"

const maxClasses = 7
const minClasses = 5

var departments = []

var selectedDepartment = "0"
var selectedCourseCodes = []

var selectedCourse = "0"
var selectedTeachers = []

var selectedOffBlockNumber = "0"
var selectedOffBlocks = []

var checkboxesDisabled = false
var checkboxes = []

var courseNames = []

$.ajaxSetup({
  // Disable caching of AJAX responses
  cache: false
})

$(function() {
    loadCourseSelection()
})

//MARK: - Course Selection

function loadCourseSelection()
{
    //Reset checkboxes
    checkboxes = []
    checkboxesDisabled = false

    //Setup HTML elements
    setupCourseSelectionElements()

    //Get side scroller objects
    getDepartmentObjects(function(departmentsTmp) {
        departments = departmentsTmp

        //Create a row for each object
        for (departmentObject in departments)
        {
            var departmentRow = $("<div class='departmentScroller' id='dep" + departments[departmentObject].departmentNum + "'><h3 style='color:WHITE;'>" + departments[departmentObject].departmentTitle + "</h3></div>")
            departmentRow.attr("onclick", "selectDepartment(this)")
            $(".departmentScrollerContainer").append(departmentRow)
        }

        //Select first object
        selectDepartment($("#dep1"))
    })

    //Add selected courses if any exist
    for (courseCodeNum in selectedCourseCodes)
    {
        addToMySchedule(selectedCourseCodes[courseCodeNum])
    }
    if (selectedCourseCodes.length >= minClasses)
    {
        $(".mySchedule").append("<input id='nextButton' type='button' value='Next' onclick='loadTeacherSelection()'>")
    }
}

function setupCourseSelectionElements()
{
    //Add scroller, checkbox container, and selected object container
    var selection = $("#selection")

    selection.empty()

    selection.append("<div class='departmentScrollerContainer'></div>")
    selection.append("<div class=classSelectionContainer><div class='classSelection'></div></div>")
    selection.append("<div class=myScheduleContainer><div class='mySchedule'><h3><div id='myScheduleTitle'>My Schedule</div></h3></div></div>")

    $("#instructions").html("Choose your classes and then click \"Next\"")
}

function getDepartmentObjects(completion)
{
    //Get departments from source
    $.getJSON(dataSource, {"table":"departments"}, function(data) {
        var departmentsTmp = []
        for (departmentIndex in data)
        {
            //Create department objects
            var departmentArray = data[departmentIndex]
            var department = new SchoolDepartment(departmentArray)
            departmentsTmp.push(department)
        }

        console.log(departmentsTmp)

        completion(departmentsTmp)
    })
}

function selectDepartment(departmentElement)
{
    //Set background colors
    if (selectedDepartment != "0")
    {
        $("#dep" + selectedDepartment).css({"background-color":"#444444"})
    }

    selectedDepartment = $(departmentElement).attr("id").replace("dep", "")

    $(departmentElement).css({"background-color":"#992222"})

    //Get course objects from department
    getCoursesFromDepartment(selectedDepartment, function(courses) {
        var classSelection = $(".classSelection")

        classSelection.empty()
        classSelection.append("<br>")
        //Add a checkbox for each course object
        for (course in courses)
        {
            var courseInput = $("<input>")

            courseInput.attr("id", courses[course].courseCode)
            courseInput.attr("type", "checkbox")
            courseInput.attr("onclick", "checkedCourse(this)")
            courseInput.prop("disabled", (checkboxesDisabled && !selectedCourseCodes.includes(courses[course].courseCode)))
            courseInput.prop("checked", (selectedCourseCodes.includes(courses[course].courseCode)))
            classSelection.append(courseInput)
            classSelection.append(" " + courses[course].courseName + "<br>")

            checkboxes.push(courseInput)
        }
        classSelection.append("<br>")
    })
}

function getCoursesFromDepartment(departmentNumber, completion)
{
  //Get courses from a departmentNumber
    $.getJSON(dataSource, {"table":"courses", "column":"courseName,courseCode", "key":"departmentNumber", "value":departmentNumber}, function(data) {
        var courses = []
        for (courseIndex in data)
        {
            //Create SchoolCourse objects
            var courseArray = data[courseIndex]
            var course = new SchoolCourse(courseArray)
            courses.push(course)
        }

        completion(courses)
    })
}

function checkedCourse(checkbox)
{
    //When a course checkbox is checked
    if (checkbox.checked)
    {
        //Add it to the selected course codes
        selectedCourseCodes.push($(checkbox).attr("id"))

        if (selectedTeachers.length > 0)
        {
            //Add an array to the for the course in the selectedTeachers array
            selectedTeachers.push([])
        }

        //Disable the checkboxes if the class max is reached
        if (selectedCourseCodes.length == maxClasses)
        {
            checkboxesDisabled = true

            for (checkboxNum in checkboxes)
            {
                //Only disable if not checked
                if (!checkboxes[checkboxNum][0].checked)
                {
                    checkboxes[checkboxNum][0].disabled = true
                }
            }
        }

        //Add the course to the selected course container
        addToMySchedule($(checkbox).attr("id"))

        //Add a nextButton if there are enough selectedCourses
        if (selectedCourseCodes.length == minClasses)
        {
            $(".mySchedule").append("<input id='nextButton' type='button' value='Next' onclick='loadTeacherSelection()'>")
        }
    }
    else
    {
        if (selectedTeachers.length > 0)
        {
            //Remove the array for the selectedCourse in selectedTeac
            selectedTeachers.splice(selectedCourseCodes.indexOf($(checkbox).attr("id")), 1)
        }

        //Remove course from selectedCourseCodes
        selectedCourseCodes.splice(selectedCourseCodes.indexOf($(checkbox).attr("id")), 1)

        //Re-enable check boxes if the selectedCourseCodes count is maxClasses-1
        if (selectedCourseCodes.length == maxClasses-1)
        {
            checkboxesDisabled = false

            for (checkboxNum in checkboxes)
            {
                if (!checkboxes[checkboxNum][0].checked)
                {
                    checkboxes[checkboxNum][0].disabled = false
                }
            }
        }

        //Remove the course from the selected course container
        removeFromMySchedule($(checkbox).attr("id"))

        //Remove the nextButton if there aren't enough classes
        if (selectedCourseCodes.length == minClasses-1)
        {
            $(".mySchedule").find("#nextButton").remove()
        }
    }
}

function addToMySchedule(courseCode)
{
    //Get the course name and the department number
    $.getJSON(dataSource, {"table":"courses", "column":"courseName,departmentNumber", "key":"courseCode", "value":courseCode}, function(courseData) {
        $(".mySchedule").append("<div id=" + courseCode + ">" + departments[parseInt(courseData[0]["departmentNumber"])-1].departmentTitle + " - " + courseData[0]["courseName"] + "</div>")
    })
}

function removeFromMySchedule(courseCode)
{
    //Remove from the schedule
    $(".mySchedule").find("#" + courseCode).remove()
}

//MARK: - Teacher Selection

function loadTeacherSelection()
{
    //Reset checkboxes
    checkboxes = []
    checkboxesDisabled = false

    selectedCourse = "0"

    var updateSelectedTeachers = (selectedTeachers.length == 0)

    //Setup HTML elements
    setupTeacherSelectionElements()

    //Get side scroller objects
    getCourses(selectedCourseCodes, function(courses)
    {
        var selectedCourseCodesTmp = []

        for (courseNum in courses)
        {
            //Create a row for each object
            var courseRow = $("<div class='courseScroller' id='course" + courses[courseNum].courseCode + "'><h3 style='color:WHITE;'>" + courses[courseNum].courseName + "</h3></div>")
            courseRow.attr("onclick", "selectCourse(this)")
            $(".courseScrollerContainer").append(courseRow)

            selectedCourseCodesTmp.push(courses[courseNum].courseCode)
            if (updateSelectedTeachers)
            {
                selectedTeachers.push([])
            }
        }

        selectedCourseCodes = selectedCourseCodesTmp
        console.log(selectedCourseCodes)

        //Select first object
        selectCourse($("#course" + selectedCourseCodes[0]))
    })

    //Add any previous selectedTeachers to myTeachers
    addAllTeachersToMyTeachers()

    //Test if there is at least one selected teacher for each course
    var canContinue = true
    for (var selectedTeacherArrayKey in selectedTeachers)
    {
        if (selectedTeachers[selectedTeacherArrayKey].length == 0)
        {
            canContinue = false
        }
    }
    if (selectedTeachers.length == 0)
    {
        canContinue = false
    }

    //Add the nextButton if there is
    if (canContinue)
    {
        $(".myTeachers").append("<input id='nextButton' type='button' value='Next' onclick='loadOffBlockSelection()'>")
    }
}

function setupTeacherSelectionElements()
{
    //Add scroller, checkbox container, and selected object container
    var selection = $("#selection")

    selection.empty()

    selection.append("<div class='courseScrollerContainer'></div>")
    selection.append("<div class='teacherSelectionContainer'><div class='teacherSelection'></div></div>")
    selection.append("<div class='myTeachersContainer'><div class='myTeachers'><h3><div id='myTeachersTitle'>My Teachers</div></h3><br></div></div>")

    $("#instructions").html("Choose any teachers you want to have and then click \"Next\"")
}

function getCourses(courseCodeArray, completion)
{
    //Get courses from courseCodes
    var whereSQL = ""
    for (courseCodeNum in courseCodeArray)
    {
        if (courseCodeNum != 0)
        {
            whereSQL += " or "
        }
        whereSQL += "courseCode=\"" + courseCodeArray[courseCodeNum] + "\""
    }

    $.getJSON(dataSource, {"table":"courses", "where":whereSQL, "order":"departmentNumber,courseName asc"}, function(data) {
        var courses = []

        for (courseNum in data)
        {
            //Create course objects
            var courseArray = data[courseNum]
            var course = new SchoolCourse(courseArray)
            courses.push(course)
        }

        completion(courses)
    })
}

function getTeachersForCourse(courseCode, completion)
{
    //Fetch teachers from courseCode
    $.getJSON(dataSource, {"table":"blocks", "column":"teacher", "key":"courseCode", "value":courseCode, "distinct":"618", "order":"teacher asc"}, function(data) {
        var teachers = []
        for (teacherObjectNum in data)
        {
            teachers.push(data[teacherObjectNum].teacher)
        }
        completion(teachers)
    })
}

function selectCourse(courseElement)
{
    //Set background colors
    if (selectedCourse != "0")
    {
        $("#course" + selectedCourse).css({"background-color":"#444444"})
    }

    selectedCourse = $(courseElement).attr("id").replace("course", "")

    $(courseElement).css({"background-color":"#992222"})

    getTeachersForCourse(selectedCourse, function(teacherArray)
    {
        var teacherSelection = $(".teacherSelection")

        teacherSelection.empty()
        teacherSelection.append("<br>")
        for (teacher in teacherArray)
        {
            var teacherInput = $("<input>")
            teacherInput.attr("id", teacherArray[teacher])
            teacherInput.attr("type", "checkbox")
            teacherInput.attr("onclick", "checkedTeacher(this)")
            teacherInput.prop("disabled", (checkboxesDisabled && !selectedTeachers[selectedCourseCodes.indexOf(selectedCourse)].includes(teacherArray[teacher])))
            teacherInput.prop("checked", (selectedTeachers[selectedCourseCodes.indexOf(selectedCourse)].includes(teacherArray[teacher])))
            teacherSelection.append(teacherInput)
            teacherSelection.append(" " + teacherArray[teacher] + "<br>")

            checkboxes.push(teacherInput)
        }
        teacherSelection.append("<br>")
    })
}

function checkedTeacher(checkbox)
{
    if (checkbox.checked)
    {
        selectedTeachers[selectedCourseCodes.indexOf(selectedCourse)].push($(checkbox).attr("id"))

        addToMyTeachers($(checkbox).attr("id"))

        var canContinue = true
        for (var selectedTeacherArrayKey in selectedTeachers)
        {
            if (selectedTeachers[selectedTeacherArrayKey].length == 0)
            {
                canContinue = false
            }
        }

        if (canContinue)
        {
            $(".myTeachers").append("<input id='nextButton' type='button' value='Next' onclick='loadOffBlockSelection()'>")
        }
    }
    else
    {
        selectedTeachers[selectedCourseCodes.indexOf(selectedCourse)].splice(selectedTeachers.indexOf($(checkbox).attr("id")), 1)

        removeFromMyTeachers($(checkbox).attr("id"))

        var canContinue = true
        for (var selectedTeacherArrayKey in selectedTeachers)
        {
            if (selectedTeachers[selectedTeacherArrayKey].length == 0)
            {
                canContinue = false
            }
        }

        if (!canContinue)
        {
            $(".myTeachers").find("#nextButton").remove()
        }
    }
}

async function addAllTeachersToMyTeachers()
{
    for (teacherArrayNum in selectedTeachers)
    {
        for (teacherNum in selectedTeachers[teacherArrayNum])
        {
            await addToMyTeachers(selectedTeachers[teacherArrayNum][teacherNum], selectedCourseCodes[teacherArrayNum])
        }
    }
}

function addToMyTeachers(teacher, localCourse)
{
    var myTeachersPromise = new Promise((resolve, reject) => {
        getCourseName((localCourse ? localCourse : selectedCourse), function(courseName) {
            $(".myTeachers").find("br").remove()
            $(".myTeachers").append("<div id='" + (localCourse ? localCourse : selectedCourse) + SHA256(teacher) + "'>" + courseName + " - " + teacher + "</div>")
            $(".myTeachers").append("<br>")

            resolve()
        })
    })

    return myTeachersPromise
}

function removeFromMyTeachers(teacher)
{
    $(".myTeachers").find("#" + selectedCourse + SHA256(teacher)).remove()
}

//MARK: - Off Block Selection

function loadOffBlockSelection()
{
    checkboxes = []
    checkboxesDisabled = false

    selectedOffBlockNumber = "0"

    setupOffBlockSelectionElements()

    console.log(selectedTeachers)

    var updateSelectedOffBlocks = (selectedOffBlocks.length == 0)

    for (var i=0; i < maxClasses+1-selectedCourseCodes.length; i++)
    {
        var offBlockRow = $("<div class='offBlockScroller' id='offBlock" + (i+1).toString() + "'><h3 style='color:WHITE;'>" + "Off Block #" + (i+1).toString() + "</h3></div>")
        offBlockRow.attr("onclick", "selectOffBlock(this)")
        $(".offBlockScrollerContainer").append(offBlockRow)

        if (updateSelectedOffBlocks)
        {
            selectedOffBlocks.push([])
        }
    }

    reloadMyOffBlocks()

    var canContinue = true
    for (offBlockNum in selectedOffBlocks)
    {
        for (offBlockNum2 in selectedOffBlocks)
        {
            if ((offBlockNum != offBlockNum2 && selectedOffBlocks[offBlockNum].sort().join(',') === selectedOffBlocks[offBlockNum2].sort().join(',')) || selectedOffBlocks[offBlockNum].length == 0 || selectedOffBlocks[offBlockNum2].length == 0)
            {
                canContinue = false
            }
        }
    }

    if (canContinue)
    {
        $(".myOffBlocks").append("<input id='nextButton' type='button' value='Next' onclick='generateSchedules()'>")
    }

    selectOffBlock("#offBlock1")

    $("#instructions").html("Choose any off blocks you would like to have and then click \"Next\"")
}

function setupOffBlockSelectionElements()
{
    var selection = $("#selection")

    selection.empty()

    selection.append("<div class='offBlockScrollerContainer'></div>")
    selection.append("<div class='offBlockSelectionContainer' style='position:relative'><div class='offBlockSelection'><br></div><button id='selectButton' onclick='selectAllOffBlocks()' style='position:absolute; top:20; right:20; vertical-align: top'>Select All</button></div>")
    selection.append("<div class='myOffBlocksContainer'><div class='myOffBlocks'><h3><div id='myOffBlocksTitle'>My Off Blocks</div></h3><br></div></div>")
}

function selectOffBlock(offBlockElement)
{
    if (selectedOffBlockNumber != "0")
    {
        $("#offBlock" + selectedOffBlockNumber).css({"background-color":"#444444"})
    }

    selectedOffBlockNumber = $(offBlockElement).attr("id").replace("offBlock", "")

    $(offBlockElement).css({"background-color":"#992222"})

    var offBlockSelection = $(".offBlockSelection")

    offBlockSelection.empty()
    offBlockSelection.append("<br>")
    for (var i=0; i < maxClasses+1; i++)
    {
        var offBlockInput = $("<input>")
        offBlockInput.attr("id", (i+1).toString())
        offBlockInput.attr("type", "checkbox")
        offBlockInput.attr("onclick", "checkedOffBlock(this)")
        offBlockInput.prop("disabled", (checkboxesDisabled && !selectedOffBlocks[parseInt(selectedOffBlockNumber)-1].includes(i+1)))
        offBlockInput.prop("checked", (selectedOffBlocks[parseInt(selectedOffBlockNumber)-1].includes(i+1)))
        offBlockSelection.append(offBlockInput)
        offBlockSelection.append(" " + "Block " + (i+1).toString() + "<br>")

        checkboxes.push(offBlockInput)
    }
    offBlockSelection.append("<br>")
}

function checkedOffBlock(checkbox)
{
    if (checkbox.checked)
    {
        selectedOffBlocks[parseInt(selectedOffBlockNumber)-1].push(parseInt($(checkbox).attr("id")))
    }
    else
    {
        selectedOffBlocks[parseInt(selectedOffBlockNumber)-1].splice(selectedOffBlocks[parseInt(selectedOffBlockNumber)-1].indexOf(parseInt($(checkbox).attr("id"))), 1)
    }

    reloadMyOffBlocks()
}

function reloadMyOffBlocks()
{
    $(".myOffBlocks").empty()
    $(".myOffBlocks").append("<h3><div id='myOffBlocksTitle'>My Off Blocks</div></h3>")

    for (offBlockArrayNum in selectedOffBlocks)
    {
        for (offBlockNum in selectedOffBlocks[offBlockArrayNum].sort())
        {
            $(".myOffBlocks").append("<div id='" + (parseInt(offBlockArrayNum)+1).toString() + selectedOffBlocks[offBlockArrayNum][offBlockNum].toString() + "'>" + "<div style='display:inline;" + (offBlockNum == 0 ? "" : "visibility:hidden;") + "'>" + ("#" + (parseInt(offBlockArrayNum)+1).toString()) + "</div>" + " - Block " + selectedOffBlocks[offBlockArrayNum][offBlockNum].toString() + "</div>")
        }
    }

    var canContinue = true
    for (offBlockNum in selectedOffBlocks)
    {
        for (offBlockNum2 in selectedOffBlocks)
        {
            if ((offBlockNum != offBlockNum2 && selectedOffBlocks[offBlockNum].sort().join(',') === selectedOffBlocks[offBlockNum2].sort().join(',') && selectedOffBlocks[offBlockNum].length < selectedOffBlocks.length && selectedOffBlocks[offBlockNum2].length < selectedOffBlocks.length) || selectedOffBlocks[offBlockNum].length == 0 || selectedOffBlocks[offBlockNum2].length == 0)
            {
                canContinue = false
            }
        }
    }

    if (canContinue)
    {
        $(".myOffBlocks").append("<input id='nextButton' type='button' value='Next' onclick='generateSchedules()'>")
    }

    $(".myOffBlocks").append("<br>")
}

function selectAllOffBlocks()
{
    selectedOffBlocks[parseInt(selectedOffBlockNumber)-1] = []
    for (var i=0; i < maxClasses+1; i++)
    {
        var checkbox = $("#" + (parseInt(i)+1).toString())
        checkbox.prop("checked", true)
        checkedOffBlock(checkbox[0])
    }
}

//MARK: - Generate Schedules

const offBlockID = "OFFBLOCK"
const scheduleDisplayCount = 10
var numberOfSchedulesDisplaying = 0

var blockArrays = []
var schedules = []
var currentSchedule = []

async function generateSchedules()
{
    blockArrays = []
    schedules = []
    currentSchedule = []
    numberOfSchedulesDisplaying = 0

    $("#instructions").html("Generating...")

    for (var i=0; i < maxClasses+1; i++)
    {
        blockArrays.push([])
    }

    for (selectedCourseNum in selectedCourseCodes)
    {
        await sortBlockArray(selectedCourseCodes[selectedCourseNum])
    }

    for (offBlockArrayNum in selectedOffBlocks)
    {
        for (offBlockNum in selectedOffBlocks[offBlockArrayNum])
        {
            blockArrays[selectedOffBlocks[offBlockArrayNum][offBlockNum]-1][offBlockID] = []
        }
    }

    console.log(blockArrays)

    createSchedules()

    $("#selection").empty()
    displaySchedules()
}

function sortBlockArray(selectedCourseCode)
{
    var sortBlockArrayPromise = new Promise(function(resolveBlockArray, rejectBlockArray) {
        /*var whereSQL = "courseCode=\"" + selectedCourseCodes[selectedCourseNum] + "\" and ("
        for (teacher in selectedTeachers[selectedCourseCodes.indexOf(selectedCourseCode)])
        {
            if (teacher != 0)
            {
                whereSQL += " or "
            }
            whereSQL += "teacher=\"" + selectedTeachers[selectedCourseCodes.indexOf(selectedCourseCode)][teacher] + "\""
        }
        whereSQL += ")"

        $.getJSON(dataSource, {"table":"blocks", "distinct":"618", "column":"blockNumber,count(blockNumber)", "where":whereSQL, "group":"blockNumber", "order":"blockNumber asc"}, function(data) {*/
        getBlockDataFromCourseCodeAndSelectedTeachers(selectedCourseCode, "blockNumber,count(blockNumber),group_concat(teacher separator '--')", function(data) {
            for (countNum in data)
            {
                if (parseInt(data[countNum]["count(blockNumber)"]) > 0)
                {
                    blockArrays[parseInt(data[countNum]["blockNumber"])-1][selectedCourseCode] = data[countNum]["group_concat(teacher separator '--')"].split("--")
                }
            }

            resolveBlockArray()
        })
    })

    return sortBlockArrayPromise
}

function getBlockDataFromCourseCodeAndSelectedTeachers(courseCode, column, completion)
{
    var whereSQL = "courseCode=\"" + courseCode + "\" and ("
    for (teacher in selectedTeachers[selectedCourseCodes.indexOf(courseCode)])
    {
        if (teacher != 0)
        {
            whereSQL += " or "
        }
        whereSQL += "teacher=\"" + selectedTeachers[selectedCourseCodes.indexOf(courseCode)][teacher] + "\""
    }
    whereSQL += ")"

    $.getJSON(dataSource, {"table":"blocks", "distinct":"618", "column":column, "where":whereSQL, "group":"blockNumber", "order":"blockNumber asc"}, function(data) {
        completion(data)
    })
}

function createSchedules()
{
    scheduleLoopSearch(0, [])
    console.log(schedules)
}

function scheduleLoopSearch(indexOn)
{
    if (blockArrays.length > indexOn)
    {
        for (var object in Object.keys(blockArrays[indexOn]))
        {
            if (currentSchedule.includes(Object.keys(blockArrays[indexOn])[object]))
            {
                continue
            }

            currentSchedule.push(Object.keys(blockArrays[indexOn])[object])
            scheduleLoopSearch(indexOn+1)
        }
    }
    else
    {
        schedules.push(currentSchedule)
        currentSchedule = currentSchedule.concat()
    }

    currentSchedule.pop()
}

async function displaySchedules()
{
    if ($("#showMoreButton") != null)
    {
        $("#showMoreButton").remove()
    }

    for (scheduleNum in schedules)
    {
        if (numberOfSchedulesDisplaying > scheduleNum)
        {
            continue
        }

        var scheduleHTML = "<div class='scheduleContainer'><div class='schedule' id='schedule" + (parseInt(scheduleNum)+1).toString() + "'><h3>Schedule " + (parseInt(scheduleNum)+1).toString() + "</h3><h4>"
        for (scheduleBlockNum in schedules[scheduleNum])
        {
            if (schedules[scheduleNum][scheduleBlockNum] == offBlockID)
            {
                scheduleHTML += "Block " + (parseInt(scheduleBlockNum)+1).toString() + ": Off Block<br>"
            }
            else
            {
                scheduleHTML += "Block " + (parseInt(scheduleBlockNum)+1).toString() + ": "

                await getCourseName(schedules[scheduleNum][scheduleBlockNum], function(courseName) {
                    scheduleHTML += courseName + " - "
                })

                var whereSQL = "courseCode=\"" + schedules[scheduleNum][scheduleBlockNum] + "\" and blockNumber=" + (parseInt(scheduleBlockNum)+1).toString() + " and ("

                /*for (teacherNum in selectedTeachers[selectedCourseCodes.indexOf(schedules[scheduleNum][scheduleBlockNum])])
                {
                    if (teacherNum != 0)
                    {
                        whereSQL += " or "
                    }
                    whereSQL += "teacher=\"" + selectedTeachers[selectedCourseCodes.indexOf(schedules[scheduleNum][scheduleBlockNum])][teacherNum] + "\""
                }
                whereSQL += ")"

                await getScheduleBlockTeachers(whereSQL, function(data) {
                    for (teacherNum in data)
                    {
                        if (teacherNum != 0)
                        {
                            scheduleHTML += " or "
                        }
                        scheduleHTML += data[teacherNum]["teacher"]
                    }

                    scheduleHTML += "<br>"
                })*/

                let teacherArray = blockArrays[scheduleBlockNum][schedules[scheduleNum][scheduleBlockNum]]
                for (teacherNum in teacherArray)
                {
                    if (teacherNum != 0)
                    {
                        scheduleHTML += " or "
                    }
                    scheduleHTML += teacherArray[teacherNum]
                }

                scheduleHTML += "<br>"
            }
        }

        scheduleHTML += "</div></div><br><br>"
        $("#selection").append(scheduleHTML)

        numberOfSchedulesDisplaying += 1
        $("#instructions").html("Generating... (" + numberOfSchedulesDisplaying + "/" + schedules.length + ")")

        if (numberOfSchedulesDisplaying % scheduleDisplayCount == 0)
        {
            $("#selection").append("<button id='showMoreButton' onclick='displaySchedules()'>Show More</button>")
            break
        }
    }

    $("#instructions").html("Done! (" + numberOfSchedulesDisplaying + "/" + schedules.length + ")")
    $("#instructions").append("  <button onclick='loadCourseSelection()'>Edit</button> <button onclick='reloadPage()'>Clear</button>")
}

function getScheduleBlockTeachers(whereSQL, completion)
{
    var jsonPromise = new Promise((resolveJSON, rejectJSON) => {
        $.getJSON(dataSource, {"table":"blocks", "distinct":"618", "column":"teacher", "where":whereSQL}, function(data) {
            completion(data)

            resolveJSON()
        })
    })

    return jsonPromise
}

function getCourseName(courseCode, completion)
{
    var getCourseNamePromise = new Promise((resolve, reject) => {
        if (Object.keys(courseNames).length == 0 || courseNames[courseCode] == null)
        {
            whereSQL = ""
            for (selectedCourseCodeNum in selectedCourseCodes)
            {
                if (selectedCourseCodeNum != 0)
                {
                    whereSQL += " or "
                }
                whereSQL += "courseCode=\"" + selectedCourseCodes[selectedCourseCodeNum] + "\""
            }

            $.getJSON(dataSource, {"table":"courses", "column":"courseName,courseCode", "where":whereSQL}, function(courseData) {
                for (courseNum in courseData)
                {
                    courseNames[courseData[courseNum]["courseCode"]] = courseData[courseNum]["courseName"]
                }

                completion(courseNames[courseCode])
                resolve()
            })
        }
        else
        {
            completion(courseNames[courseCode])
            resolve()
        }
    })

    return getCourseNamePromise
}

function reloadPage()
{
    $(document.body).append('<meta http-equiv="refresh" content="0;url=./index.html">')
}

//MARK: - Filters

function filterSchedulesBy(filterDictionary)
{

}

//MARK: - Sessions

function saveSession(id)
{
    console.log("Saving Data...")
    console.log({"command":"save", "id":id, "coursesJSON":JSON.stringify(selectedCourseCodes), "teachersJSON":JSON.stringify(selectedTeachers), "offBlocksJSON":JSON.stringify(selectedOffBlocks)})

    $.post(sessionSource, {"command":"save", "id":id, "coursesJSON":JSON.stringify(selectedCourseCodes), "teachersJSON":JSON.stringify(selectedTeachers), "offBlocksJSON":JSON.stringify(selectedOffBlocks)}, function(data) {
        console.log("Data Saved!")
    })
}

function loadSession(id)
{
    $.post(sessionSource, {"command":"load", "id":id}, function(data) {
        loadSessionJSON(data)

        loadCourseSelection()
    })
}

function loadSessionJSON(json)
{
    selectedCourseCodes = JSON.parse(json[0]["coursesJSON"])
    selectedTeachers = JSON.parse(json[0]["teachersJSON"])
    selectedOffBlocks = JSON.parse(json[0]["offBlocksJSON"])
}
