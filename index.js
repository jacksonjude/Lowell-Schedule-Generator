const rootHost = "https://scheduledata2.herokuapp.com"
const dataSource = rootHost + "/query/"
const sessionSource = rootHost + "/session/"
const arenaSource = "http://lowell-courseselection.org"

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

var courseNames = {}

function getJSON(dataSource, arguments, callback)
{
  $("#loader").show()
  $.getJSON(dataSource, arguments, function(data)
  {
    $("#loader").hide()
    callback(data)
  })
}

$.ajaxSetup({
  //Disable caching of AJAX responses
  cache: false
})

$(function()
{
  addMobileMessages()
  setupSessionButtons()

  var url = new URL(window.location.href);
  var shareUUID = url.searchParams.get("shareUUID");
  if (shareUUID != null)
  {
    loadSession(shareUUID, function() {reloadThenShowFavorites()}, true)
  }
  else
  {
    loadCourseSelection()
  }
})

function isMobile()
{
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

function addMobileMessages()
{
  if (isMobile())
  {
    window.addEventListener("orientationchange", function() {
      editMobileMessages()
    })
    if (window.innerHeight > window.innerWidth)
    {
      $("#instructionsContainer").append("<span id='mmlandscape'><h3 style='color:white;'>* For a better experience, try viewing the website in landscape mode</h3></span>")
    }
  }
}

function editMobileMessages()
{
  if (window.innerHeight < window.innerWidth)
  {
    $("#mmlandscape").empty()
  }
  else
  {
    addMobileMessages()
  }
}

function setupSessionButtons()
{
  var widthOfBox = 150
  $("#sessionID").css('width', widthOfBox)
  $("#saveButton").css('width', widthOfBox / 3)
  $("#loadButton").css('width', widthOfBox / 3)
  $("#favoriteButton").css('width', widthOfBox / 3)
  $("#shareButton").css('width', widthOfBox)
  $("#sessionShare").css('width', widthOfBox)
  $("#sessionShare").hide()
}

//MARK: - Course Selection

function loadCourseSelection()
{
  showingFavorites = false

  itemToMoveFrom = "0"

  //Reset checkboxes
  checkboxes = []
  checkboxesDisabled = false

  //Setup HTML elements
  setupCourseSelectionElements()

  //Get side scroller objects
  getDepartmentObjects(function(departmentsTmp)
  {
    departments = departmentsTmp

    //Create a row for each object
    for (departmentObject in departments)
    {
      var departmentRow = $("<div class='departmentScroller' id='dep" + departments[departmentObject].departmentNum + "'><span style='z-index:2; position:relative;'><h3 style='color:WHITE;'>" + departments[departmentObject].departmentTitle + "</h3></span></div>")
      departmentRow.attr("onclick", "selectDepartment(this)")
      $(".departmentScrollerContainer").append(departmentRow)
    }

    //Select first object
    selectedDepartment = "1"
    selectDepartment($("#dep1"))
    selectedItem = "1"
    itemToMoveFrom = "1"
    moveSelectionBox("#dep", 1, true)
  })

  //Add selected courses if any exist
  for (courseCodeNum in selectedCourseCodes)
  {
    addToMyCourses(selectedCourseCodes[courseCodeNum])
  }
  if (selectedCourseCodes.length >= minClasses)
  {
    $(".myCourses").append("<input id='nextButton' type='button' value='Next' onclick='loadTeacherSelection()'>")
  }
}

function setupCourseSelectionElements()
{
  //Add scroller, checkbox container, and selected object container
  var selection = $("#selection")

  selection.empty()

  selection.append("<div class='departmentScrollerContainer'><div class='selectedAnimationBox' id='selectionbox'></div></div>")
  selection.append("<div class=classSelectionContainer><div class='classSelection'></div></div>")
  selection.append("<div class=myCoursesContainer><div class='myCourses'><h3><div id='myCoursesTitle'>My Courses</div></h3></div></div>")

  $("#instructions").html("Choose your classes and then click \"Next\"")
}

function getDepartmentObjects(completion)
{
  //Get departments from source
  getJSON(dataSource,
  {
    "table": "departments"
  }, function(data)
  {
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
  var itemToMoveFromTmp = selectedDepartment
  selectedDepartment = $(departmentElement).attr("id").replace("dep", "")

  if (itemToMoveFromTmp != selectedDepartment)
  {
    itemToMoveFrom = itemToMoveFromTmp
    selectedItem = selectedDepartment
    var movementDirection = Math.sign(selectedItem - itemToMoveFrom)
    moveSelectionBox("#dep", movementDirection)
  }

  //Get course objects from department
  getCoursesFromDepartment(selectedDepartment, function(courses)
  {
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

const timeToMoveBox = 200
const moveBoxInterval = 5
var itemToMoveFrom = ""
var selectedItem = ""

function moveSelectionBox(currentIDPrefix, movementDirection, overrideCheck)
{
  if (itemToMoveFrom != selectedItem || overrideCheck)
  {
    $("#selectionbox").css("width", $(currentIDPrefix + selectedItem).css("width"))
    $("#selectionbox").css("height", $(currentIDPrefix + selectedItem).css("height"))
    var percentToMove = moveBoxInterval/timeToMoveBox
    var topPosition = $("#selectionbox").position().top
    //console.log(itemToMoveFrom + " -- " + selectedItem)
    var positionToMoveTo = $(currentIDPrefix + selectedItem).offset().top
    var positionToMoveFrom = $(currentIDPrefix + itemToMoveFrom).offset().top

    var moveAmount = (positionToMoveTo-positionToMoveFrom)*percentToMove

    //console.log(positionToMoveTo + " -- " + positionToMoveFrom)

    if ((movementDirection == 1 && $("#selectionbox").offset().top > positionToMoveTo) || movementDirection == -1 && $("#selectionbox").offset().top < positionToMoveTo)
    {
      $("#selectionbox").css("top", $(currentIDPrefix + selectedItem).position().top)
      return
    }

    $("#selectionbox").css("top", topPosition + moveAmount)

    setTimeout(function() {
      moveSelectionBox(currentIDPrefix, movementDirection)
    }, moveBoxInterval)
  }
}

function getCoursesFromDepartment(departmentNumber, completion)
{
  //Get courses from a departmentNumber
  getJSON(dataSource,
  {
    "table": "courses",
    "column": "courseName,courseCode",
    "key": "departmentNumber",
    "value": departmentNumber
  }, function(data)
  {
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
    addToMyCourses($(checkbox).attr("id"))

    //Add a nextButton if there are enough selectedCourses
    if (selectedCourseCodes.length == minClasses)
    {
      $(".myCourses").append("<input id='nextButton' type='button' value='Next' onclick='loadTeacherSelection()'>")
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
    if (selectedCourseCodes.length == maxClasses - 1)
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
    removeFromMyCourses($(checkbox).attr("id"))

    //Remove the nextButton if there aren't enough classes
    if (selectedCourseCodes.length == minClasses - 1)
    {
      $(".myCourses").find("#nextButton").remove()
    }
  }
}

function addToMyCourses(courseCode)
{
  //Get the course name and the department number
  getJSON(dataSource,
  {
    "table": "courses",
    "column": "courseName,departmentNumber",
    "key": "courseCode",
    "value": courseCode
  }, function(courseData)
  {
    $(".myCourses").append("<div id=" + courseCode + ">" + departments[parseInt(courseData[0]["departmentNumber".toLowerCase()]) - 1].departmentTitle + " - " + courseData[0]["courseName".toLowerCase()] + "</div>")
  })
}

function removeFromMyCourses(courseCode)
{
  //Remove from the schedule
  $(".myCourses").find("#" + courseCode).remove()
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

    courses.sort(function(a, b) {
      return selectedCourseCodes.indexOf(a.courseCode) > selectedCourseCodes.indexOf(b.courseCode)
    })

    for (courseNum in courses)
    {
      //Create a row for each object
      var courseRow = $("<div class='courseScroller' id='course" + courses[courseNum].courseCode + "'><span style='z-index:2; position:relative;'><h3 style='color:WHITE;'>" + courses[courseNum].courseName + "</h3></span></div>")
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
    selectedCourse = selectedCourseCodes[0]
    selectCourse($("#course" + selectedCourseCodes[0]))
    selectedItem = selectedCourseCodes[0]
    itemToMoveFrom = selectedCourseCodes[0]
    moveSelectionBox("#course", 1, true)
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

  selection.append("<div class='courseScrollerContainer'><div class='selectedAnimationBox' id='selectionbox'></div></div>")
  selection.append("<div class='teacherSelectionContainer'><div class='teacherSelection'></div><button id='selectButton' onclick='selectAllTeachers()' style='position:absolute; top:20; right:20; vertical-align: top'>Select All</button></div>")
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
    whereSQL += "courseCode=\'" + courseCodeArray[courseCodeNum] + "\'"
  }

  getJSON(dataSource,
  {
    "table": "courses",
    "where": whereSQL/*,
    "order": "departmentNumber,courseName asc"*/
  }, function(data)
  {
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
  getJSON(dataSource,
  {
    "table": "blocks",
    "column": "teacher",
    "key": "courseCode",
    "value": courseCode,
    "distinct": "618",
    "order": "teacher asc"
  }, function(data)
  {
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
  checkboxes = []

  var itemToMoveFromTmp = selectedCourse
  selectedCourse = $(courseElement).attr("id").replace("course", "")

  if (itemToMoveFromTmp != selectedCourse)
  {
    selectedItem = selectedCourse
    itemToMoveFrom = itemToMoveFromTmp
    var movementDirection = Math.sign(selectedCourseCodes.indexOf(selectedItem) - selectedCourseCodes.indexOf(itemToMoveFrom))
    moveSelectionBox("#course", movementDirection)
  }

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
  var myTeachersPromise = new Promise((resolve, reject) =>
  {
    getCourseName((localCourse ? localCourse : selectedCourse), function(courseName)
    {
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

function selectAllTeachers()
{
  for (teacherNum in selectedTeachers[selectedCourseCodes.indexOf(selectedCourse)])
  {
    removeFromMyTeachers(selectedTeachers[selectedCourseCodes.indexOf(selectedCourse)][teacherNum])
  }

  selectedTeachers[selectedCourseCodes.indexOf(selectedCourse)] = []
  for (checkbox in checkboxes)
  {
    checkboxes[checkbox].prop("checked", true)
    checkedTeacher(checkboxes[checkbox][0])
  }
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

  for (var i = 0; i < maxClasses + 1 - selectedCourseCodes.length; i++)
  {
    var offBlockRow = $("<div class='offBlockScroller' id='offBlock" + (i + 1).toString() + "'><span style='z-index:2; position:relative;'><h3 style='color:WHITE;'>" + "Off Block #" + (i + 1).toString() + "</h3></span></div>")
    offBlockRow.attr("onclick", "selectOffBlock(this)")
    $(".offBlockScrollerContainer").append(offBlockRow)

    if (updateSelectedOffBlocks)
    {
      selectedOffBlocks.push([])
    }
  }

  while (!updateSelectedOffBlocks && selectedOffBlocks.length != maxClasses + 1 - selectedCourseCodes.length)
  {
    selectedOffBlocks.push([])
  }

  reloadMyOffBlocks()

  selectedOffBlockNumber = "1"
  selectOffBlock("#offBlock1")
  selectedItem = "1"
  itemToMoveFrom = "1"
  moveSelectionBox("#offBlock", 1, true)

  $("#instructions").html("Choose any off blocks you would like to have and then click \"Next\"")
}

function setupOffBlockSelectionElements()
{
  var selection = $("#selection")

  selection.empty()

  selection.append("<div class='offBlockScrollerContainer'><div class='selectedAnimationBox' id='selectionbox'></div></div>")
  selection.append("<div class='offBlockSelectionContainer' style='position:relative'><div class='offBlockSelection'><br></div><button id='selectButton' onclick='selectAllOffBlocks()' style='position:absolute; top:20; right:20; vertical-align: top'>Select All</button></div>")
  selection.append("<div class='myOffBlocksContainer'><div class='myOffBlocks'><h3><div id='myOffBlocksTitle'>My Off Blocks</div></h3><br></div></div>")
}

function selectOffBlock(offBlockElement)
{
  var itemToMoveFromTmp = selectedOffBlockNumber
  selectedOffBlockNumber = $(offBlockElement).attr("id").replace("offBlock", "")

  if (itemToMoveFromTmp != selectedOffBlockNumber)
  {
    selectedItem = selectedOffBlockNumber
    itemToMoveFrom = itemToMoveFromTmp
    var movementDirection = Math.sign(selectedOffBlockNumber - itemToMoveFrom)
    moveSelectionBox("#offBlock", movementDirection)
  }

  var offBlockSelection = $(".offBlockSelection")

  offBlockSelection.empty()
  offBlockSelection.append("<br>")
  for (var i = 0; i < maxClasses + 1; i++)
  {
    var offBlockInput = $("<input>")
    offBlockInput.attr("id", (i + 1).toString())
    offBlockInput.attr("type", "checkbox")
    offBlockInput.attr("onclick", "checkedOffBlock(this)")
    offBlockInput.prop("disabled", (checkboxesDisabled && !selectedOffBlocks[parseInt(selectedOffBlockNumber) - 1].includes(i + 1)))
    offBlockInput.prop("checked", (selectedOffBlocks[parseInt(selectedOffBlockNumber) - 1].includes(i + 1)))
    offBlockSelection.append(offBlockInput)
    offBlockSelection.append(" " + "Block " + (i + 1).toString() + "<br>")

    checkboxes.push(offBlockInput)
  }
  offBlockSelection.append("<br>")
}

function checkedOffBlock(checkbox)
{
  if (checkbox.checked)
  {
    selectedOffBlocks[parseInt(selectedOffBlockNumber) - 1].push(parseInt($(checkbox).attr("id")))
  }
  else
  {
    selectedOffBlocks[parseInt(selectedOffBlockNumber) - 1].splice(selectedOffBlocks[parseInt(selectedOffBlockNumber) - 1].indexOf(parseInt($(checkbox).attr("id"))), 1)
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
      $(".myOffBlocks").append("<div id='" + (parseInt(offBlockArrayNum) + 1).toString() + selectedOffBlocks[offBlockArrayNum][offBlockNum].toString() + "'>" + "<div style='display:inline;" + (offBlockNum == 0 ? "" : "visibility:hidden;") + "'>" + ("#" + (parseInt(offBlockArrayNum) + 1).toString()) + "</div>" + " - Block " + selectedOffBlocks[offBlockArrayNum][offBlockNum].toString() + "</div>")
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
  selectedOffBlocks[parseInt(selectedOffBlockNumber) - 1] = []
  for (var i = 0; i < maxClasses + 1; i++)
  {
    var checkbox = $("#" + (parseInt(i) + 1).toString())
    checkbox.prop("checked", true)
    checkedOffBlock(checkbox[0])
  }
}

//MARK: - Generate Schedules

const offBlockID = "OFFBLOCK"
const scheduleDisplayCount = 10

var blockArrays = []
var filters = []
var favoriteSchedules = {}

var schedules = []
var currentSchedule = []
var numberOfSchedulesDisplaying = 0

var showingFavorites = false

async function generateSchedules(completion)
{
  blockArrays = []
  var filtersToKeep = []
  for (filterNum in filters)
  {
    if (selectedCourseCodes.includes(filters[filterNum]["courseCode"]) && selectedTeachers[selectedCourseCodes.indexOf(filters[filterNum]["courseCode"])].includes(filters[filterNum]["teacher"]))
    {
      filtersToKeep.push(filters[filterNum])
    }
  }
  filters = filtersToKeep

  //$("#selection > *:not('.filterSelectionContainer')").remove()
  $("#selection").empty()
  $("#instructions").html("Generating...")

  for (var i = 0; i < maxClasses + 1; i++)
  {
    blockArrays.push({})
  }

  for (selectedCourseNum in selectedCourseCodes)
  {
    await sortBlockArray(selectedCourseCodes[selectedCourseNum])
  }

  for (offBlockArrayNum in selectedOffBlocks)
  {
    for (offBlockNum in selectedOffBlocks[offBlockArrayNum])
    {
      blockArrays[selectedOffBlocks[offBlockArrayNum][offBlockNum] - 1][offBlockID + (parseInt(offBlockArrayNum)).toString()] = {}
    }
  }

  loadSchedules(completion)
}

function loadSchedules(completion)
{
  schedules = []
  currentSchedule = []
  numberOfSchedulesDisplaying = 0

  createSchedules()

  displaySchedules(null, completion)
}

function sortBlockArray(selectedCourseCode)
{
  var sortBlockArrayPromise = new Promise(function(resolveBlockArray, rejectBlockArray)
  {
    getBlockDataFromCourseCodeAndSelectedTeachers(selectedCourseCode, "blockNumber,count(blockNumber),string_agg(teacher, '--')", async function(data)
    {
      for (countNum in data)
      {
        if (parseInt(data[countNum]["count"]) > 0)
        {
          var teacherData = data[countNum]["string_agg"].split("--")
          for (teacherNum in teacherData)
          {
            await checkForFullClass(selectedCourseCode, teacherData[teacherNum], data[countNum]["blockNumber".toLowerCase()]).then(function(full){
              if (full)
              {
                teacherData.splice(teacherNum, 1)
              }
            })
          }

          blockArrays[parseInt(data[countNum]["blockNumber".toLowerCase()]) - 1][selectedCourseCode] = teacherData
        }
      }

      resolveBlockArray()
    })
  })

  return sortBlockArrayPromise
}

function getBlockDataFromCourseCodeAndSelectedTeachers(courseCode, column, completion)
{
  var whereSQL = "courseCode=\'" + courseCode + "\' and ("
  for (teacher in selectedTeachers[selectedCourseCodes.indexOf(courseCode)])
  {
    if (teacher != 0)
    {
      whereSQL += " or "
    }
    whereSQL += "teacher=\'" + selectedTeachers[selectedCourseCodes.indexOf(courseCode)][teacher].replace(new RegExp("\"", 'g'), "\\\"") + "\'"
  }
  whereSQL += ")"

  getJSON(dataSource,
  {
    "table": "blocks",
    "distinct": "618",
    "column": column,
    "where": whereSQL,
    "group": "blockNumber",
    "order": "blockNumber asc"
  }, function(data)
  {
    completion(data)
  })
}

function createSchedules()
{
  scheduleLoopSearch(0, [])
  schedules = multiDimensionalUnique(schedules)
  console.log(schedules)
}

function scheduleLoopSearch(indexOn)
{
  if (blockArrays.length > indexOn)
  {
    for (var object in Object.keys(blockArrays[indexOn]))
    {
      let courseBlock = Object.keys(blockArrays[indexOn])[object]
      if (courseBlock.includes(offBlockID))
      {
        courseBlock = courseBlock.replace(courseBlock.replace(offBlockID, ""), "")
      }

      if (currentSchedule.includes(courseBlock) && (courseBlock != offBlockID || countInArray(currentSchedule, courseBlock) >= maxClasses + 1 - selectedCourseCodes.length))
      {
        continue
      }

      currentSchedule.push(courseBlock)
      scheduleLoopSearch(indexOn + 1)
    }
  }
  else
  {
    let shouldAddSchedule = true
    for (filterNum in filters)
    {
      if (filters[filterNum]["courseCode"] != undefined && filters[filterNum]["blockNumber"] != undefined && filters[filterNum]["teacher"] != undefined)
      {
        if (filters[filterNum]["blockNumber"] == "any")
        {
          if (filters[filterNum]["teacher"] != "any" && !blockArrays[currentSchedule.indexOf(filters[filterNum]["courseCode"])][filters[filterNum]["courseCode"]].includes(filters[filterNum]["teacher"]))
          {
            shouldAddSchedule = false
            break
          }
        }
        else if (!(currentSchedule[parseInt(filters[filterNum]["blockNumber"])] == filters[filterNum]["courseCode"] && (filters[filterNum]["teacher"] == null || filters[filterNum]["teacher"] == "any" || blockArrays[parseInt(filters[filterNum]["blockNumber"])][filters[filterNum]["courseCode"]].includes(filters[filterNum]["teacher"]))))
        {
          shouldAddSchedule = false
          break
        }
      }
    }

    if (shouldAddSchedule)
    {
      schedules.push(currentSchedule)
    }
    currentSchedule = currentSchedule.concat()
  }

  currentSchedule.pop()
}

function multiDimensionalUnique(arr)
{
  var uniques = []
  var itemsFound = {}
  for (var i = 0, l = arr.length; i < l; i++)
  {
    var stringified = JSON.stringify(arr[i])
    if (itemsFound[stringified])
    {
      continue
    }
    uniques.push(arr[i])
    itemsFound[stringified] = true
  }
  return uniques
}

function countInArray(array, what)
{
  return array.filter(item => item == what).length
}

async function displaySchedules(showMorePressed, completion)
{
  if ($("#showMoreButton") != null)
  {
    $("#showMoreButton").remove()
  }

  if (showMorePressed == null || showMorePressed == undefined || !showMorePressed)
  {
    //$("#selection > *:not('.filterSelectionContainer')").remove()
    $("#selection").empty()
  }

  for (scheduleNum in schedules)
  {
    if (numberOfSchedulesDisplaying > scheduleNum)
    {
      continue
    }

    var scheduleHTML = "<div class='scheduleContainer'><div class='schedule' id='schedule" + (parseInt(scheduleNum) + 1).toString() + "'><h3>Schedule " + (parseInt(scheduleNum) + 1).toString() + "</h3><h4>"
    let thisScheduleInnerHTML = ""
    for (scheduleBlockNum in schedules[scheduleNum])
    {
      if (schedules[scheduleNum][scheduleBlockNum] == offBlockID)
      {
        thisScheduleInnerHTML += "Block " + (parseInt(scheduleBlockNum) + 1).toString() + ": Off Block<br>"
      }
      else
      {
        thisScheduleInnerHTML += "Block " + (parseInt(scheduleBlockNum) + 1).toString() + ": "

        await getCourseName(schedules[scheduleNum][scheduleBlockNum], function(courseName)
        {
          thisScheduleInnerHTML += courseName + " - "
        })

        let filtersForBlock = []
        for (filterNum in filters)
        {
          if ((filters[filterNum]["blockNumber"] == scheduleBlockNum && filters[filterNum]["teacher"] != undefined) || (filters[filterNum]["blockNumber"] == "any" && filters[filterNum]["courseCode"] == schedules[scheduleNum][scheduleBlockNum]))
          {
            filtersForBlock = filters[filterNum]
            //break
          }
        }

        if (filtersForBlock.length > 0 && filterForBlock["teacher"] != "any")
        {
          for (filterNum in filtersForBlock)
          {
            if (filterNum != 0)
            {
              thisScheduleInnerHTML += " or "
            }
            thisScheduleInnerHTML += filtersForBlock[filterNum]["teacher"]
          }
        }
        else
        {
          let teacherArray = blockArrays[scheduleBlockNum][schedules[scheduleNum][scheduleBlockNum]]
          for (teacherNum in teacherArray)
          {
            if (teacherNum != 0)
            {
              thisScheduleInnerHTML += " or "
            }
            thisScheduleInnerHTML += teacherArray[teacherNum]
          }
        }

        thisScheduleInnerHTML += "<br>"
      }
    }

    scheduleHTML += thisScheduleInnerHTML + "</h4>"

    let imageURL = "assets/"

    let favoriteScheduleID = SHA256(JSON.stringify(schedules[scheduleNum]))
    imageURL += (Object.keys(favoriteSchedules).includes(favoriteScheduleID)) ? "favoriteIconPressed.png" : "favoriteIcon.png"

    scheduleHTML += "<input id='" + favoriteScheduleID + "' onclick='toggleFavoriteSchedule(this)' type='image' src='" + imageURL + "' class='favoriteButton' />"
    scheduleHTML += "</div>"
    scheduleHTML += "</div><br><br>"
    $("#selection").append(scheduleHTML)

    numberOfSchedulesDisplaying += 1
    $("#instructions").html("Generating... (" + numberOfSchedulesDisplaying + "/" + schedules.length + ")")

    if (numberOfSchedulesDisplaying % scheduleDisplayCount == 0)
    {
      $("#selection").append("<button id='showMoreButton' onclick='displaySchedules(true)'>Show More</button>")
      break
    }
  }

  $("#instructions").html("Done! (Showing " + numberOfSchedulesDisplaying + "/" + schedules.length + ")")
  $("#instructions").append(" " + (!showingFavorites ? " <button onclick='loadCourseSelection()'>Edit</button>" : "") + " <button onclick='reloadPage()'>Clear</button>" + " <button onclick='toggleFavoriteFilter()'>" + (showingFavorites ? "Hide Favorites" : "Show Favorites") + "</button>")

    !showingFavorites ? setupFilterMenu() : false

  completion ? completion() : false
}

function checkForFullClass(courseCode, teacherName, blockNumber)
{
  var checkForFullClassPromise = new Promise(async function(resolve, reject) {
    /*var courseName
    await getCourseName(courseCode, function(courseNameTmp)
    {
      courseName = courseNameTmp
    })*/

    //var courseRegex = new RegExp("<tr>\\s*<td>AP STATISTICS B<\\/td><td>Ambrose<\\/td><td>1<\\/td><td>N<\\/td><td>(\\d*)<\\/td>\\s*<\\/tr>")

    resolve(false)
  })

  return checkForFullClassPromise
}

function getArenaStats()
{
  /*$.ajax({
    type: "POST",
    url: arenaSource,
  }, function(data) {

  })*/

  /*$.ajax({
    type: "GET",
    url: "courseselection.html"
  })*/
}

function getScheduleBlockTeachers(whereSQL, completion)
{
  var jsonPromise = new Promise((resolveJSON, rejectJSON) =>
  {
    getJSON(dataSource,
    {
      "table": "blocks",
      "distinct": "618",
      "column": "teacher",
      "where": whereSQL
    }, function(data)
    {
      completion(data)

      resolveJSON()
    })
  })

  return jsonPromise
}

function getCourseName(courseCode, completion)
{
  var getCourseNamePromise = new Promise((resolve, reject) =>
  {
    if (Object.keys(courseNames).length == 0 || courseNames[courseCode] == null)
    {
      whereSQL = ""
      for (selectedCourseCodeNum in selectedCourseCodes)
      {
        if (selectedCourseCodeNum != 0)
        {
          whereSQL += " or "
        }
        whereSQL += "courseCode=\'" + selectedCourseCodes[selectedCourseCodeNum] + "\'"
      }

      getJSON(dataSource,
      {
        "table": "courses",
        "column": "courseName,courseCode",
        "where": whereSQL
      }, function(courseData)
      {
        for (courseNum in courseData)
        {
          courseNames[courseData[courseNum]["courseCode".toLowerCase()]] = courseData[courseNum]["courseName".toLowerCase()]
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

function toggleFavoriteSchedule(inputElement)
{
  Object.keys(favoriteSchedules).includes($(inputElement).attr("id")) ? delete favoriteSchedules[$(inputElement).attr("id")] : favoriteSchedules[$(inputElement).attr("id")] = schedules[parseInt($(inputElement).parent().attr("id").replace("schedule", "")) - 1]

  $(inputElement).attr("src", "assets/" + (Object.keys(favoriteSchedules).includes($(inputElement).attr("id")) ? "favoriteIconPressed" : "favoriteIcon") + ".png")
}

function toggleFavoriteFilter()
{
  showingFavorites = !showingFavorites
  showingFavorites ? (schedules = Object.values(favoriteSchedules), numberOfSchedulesDisplaying = 0, displaySchedules()) : (loadSchedules())
}

function reloadThenShowFavorites()
{
  generateSchedules(function()
  {
    showingFavorites = true
    schedules = Object.values(favoriteSchedules)
    numberOfSchedulesDisplaying = 0
    displaySchedules()
  })
}

//MARK: - Filters

var justRemovedFilter = false

function setupFilterMenu()
{
  var selection = $("#selection")
  if ($(".filterSelectionContainer") != null)
  {
    $(".filterSelectionContainer").remove()
  }
  selection.prepend("<div class='filterSelectionContainer'><div class='filterSelection'></div></div>")

  var filterSelection = $(".filterSelection")
  filterSelection.append('<h2 style="color: white;">Filters</h2>')

  if (filters.concat().reverse()[0] == undefined || filters.concat().reverse()[0] == null || (Object.keys(filters.concat().reverse()[0]).length > 0 && !justRemovedFilter))
  {
    filters.push({})
  }

  if (justRemovedFilter)
  {
    justRemovedFilter = false
  }

  for (var filterNum = 0; filterNum < filters.length; filterNum++)
  {
    addFilterSelectHTML(filterNum)

    $("#filterCourse" + filterNum + " option[value='" + filters[filterNum]["courseCode"] + "']").prop('selected', true)
    $("#filterBlock" + filterNum + " option[value='" + filters[filterNum]["blockNumber"] + "']").prop('selected', true)
    $("#filterTeacher" + filterNum + " option[value='" + window.btoa(filters[filterNum]["teacher"]) + "']").prop('selected', true)
  }

  filterSelection.append("<span id='filterBreaks0'><br></span>")
  filterSelection.append("<button id='addFilterButton' onclick='addFilter()'>Add Filter</button>")
  filterSelection.append("<button id='removeFilterButton' onclick='removeFilter()'>Remove Filter</button>")
  filterSelection.append("<span id='filterBreaks1'><br><br></span>")
}

function addFilterSelectHTML(filterNum)
{
  var filterSelection = $(".filterSelection")
  var filterRow = $("<span id=filterRow" + filterNum + ">")

  let courseFilterSelect = $("<select id='filterCourse" + filterNum.toString() + "'>")
  courseFilterSelect.append($('<option>',
  {
    value: "none",
    text: "None"
  }))
  $.each(courseNames, function(code, name)
  {
    courseFilterSelect.append($('<option>',
    {
      value: code,
      text: name
    }))
  })
  courseFilterSelect.append($('<option>',
  {
    value: offBlockID,
    text: "Off Block"
  }))
  courseFilterSelect.on('change', function(e)
  {
    var courseSelected = this.value
    var filterNumber = parseInt($(this).attr("id").replace("filterCourse", ""))
    if (filters[filterNumber]["courseCode"] != courseSelected)
    {
      $("#filterBlock" + filterNumber.toString()).empty()
      addDefaultFilterBlockOptions($("#filterBlock" + filterNumber.toString()))

      $("#filterTeacher" + filterNumber.toString()).empty()
      addDefaultFilterTeacherOptions($("#filterTeacher" + filterNumber.toString()))

      var shouldReload = (filters[filterNumber]["courseCode"] != undefined && filters[filterNumber]["blockNumber"] != undefined && filters[filterNumber]["teacher"] != undefined)

      if (courseSelected != "none")
      {
        filters[filterNumber]["courseCode"] = courseSelected
      }
      else
      {
        delete filters[filterNumber]["courseCode"]
      }

      delete filters[filterNumber]["blockNumber"]
      delete filters[filterNumber]["teacher"]

      addFilterBlockSelectionOptions($("#filterBlock" + filterNumber.toString()), filterNumber)
      addFilterTeacherSelectionOptions($("#filterTeacher" + filterNumber.toString()), filterNumber)

      if (shouldReload)
      {
        loadSchedules()
      }
    }
  })
  filterRow.append(courseFilterSelect)

  let blockFilterSelect = $("<select id='filterBlock" + filterNum.toString() + "'>")
  addDefaultFilterBlockOptions(blockFilterSelect)
  addFilterBlockSelectionOptions(blockFilterSelect, filterNum)

  blockFilterSelect.on('change', function(e)
  {
    var blockSelected = this.value
    var filterNumber = parseInt($(this).attr("id").replace("filterBlock", ""))
    if (filters[filterNumber]["blockNumber"] != blockSelected)
    {
      $("#filterTeacher" + filterNumber.toString()).empty()
      addDefaultFilterTeacherOptions($("#filterTeacher" + filterNumber.toString()))

      if (blockSelected != "none")
      {
        filters[filterNumber]["blockNumber"] = blockSelected
      }
      else
      {
        delete filters[filterNumber]["blockNumber"]
      }

      addFilterTeacherSelectionOptions($("#filterTeacher" + filterNumber.toString()), filterNumber)

      var shouldReload = (filters[filterNumber]["teacher"] != undefined)

      if (blockSelected == "none" || blockSelected == "any" || !(filters[filterNumber]["teacher"] == "any" || (filters[filterNumber]["courseCode"] != undefined && filters[filterNumber]["blockNumber"] != undefined && blockArrays[parseInt(filters[filterNumber]["blockNumber"])][filters[filterNumber]["courseCode"]].includes(filters[filterNumber]["teacher"]))))
      {
        delete filters[filterNumber]["teacher"]
      }

      if (shouldReload)
      {
        loadSchedules()
      }
    }
  })
  filterRow.append(blockFilterSelect)

  let teacherFilterSelect = $("<select id='filterTeacher" + filterNum.toString() + "'>")
  addDefaultFilterTeacherOptions(teacherFilterSelect)
  addFilterTeacherSelectionOptions(teacherFilterSelect, filterNum)

  teacherFilterSelect.on('change', function(e)
  {
    var filterNumber = parseInt($(this).attr("id").replace("filterTeacher", ""))
    var teacherSelected = this.value
    var filterTeacherChanged = (filters[filterNumber]["teacher"] != window.atob(teacherSelected))
    if (teacherSelected != "none")
    {
      filters[filterNumber]["teacher"] = window.atob(teacherSelected)
    }
    else
    {
      delete filters[filterNumber]["teacher"]
    }

    if (filterTeacherChanged)
    {
      loadSchedules()
    }
  })
  filterRow.append(teacherFilterSelect)

  filterSelection.append(filterRow)
  filterSelection.append("<span id='filterBreak" + filterNum + "'><br></span>")
}

function addFilterBlockSelectionOptions(blockFilterSelect, filterNum)
{
  if (filters[filterNum]["courseCode"] != offBlockID)
  {
    for (var blockNum = 0; blockNum < maxClasses + 1; blockNum++)
    {
      if (filters[filterNum]["courseCode"] != null && Object.keys(blockArrays[blockNum]).includes(filters[filterNum]["courseCode"]))
      {
        let blockName = "Block " + (parseInt(blockNum + 1)).toString()
        blockFilterSelect.append($('<option>',
        {
          value: blockNum,
          text: blockName
        }))
      }
    }
  }
  else
  {
    let offBlockRegex = RegExp(offBlockID + "\\d+")
    for (var blockNum = 0; blockNum < maxClasses + 1; blockNum++)
    {
      if (Object.keys(blockArrays[blockNum]).some(courseToTest => offBlockRegex.test(courseToTest)))
      {
        let blockName = "Block " + (parseInt(blockNum + 1)).toString()
        blockFilterSelect.append($('<option>',
        {
          value: blockNum,
          text: blockName
        }))
      }
    }
  }
}

function addFilterTeacherSelectionOptions(teacherFilterSelect, filterNum)
{
  var teachersToSelect
  if (filters[filterNum]["blockNumber"] != "any")
  {
    teachersToSelect = (filters[filterNum]["courseCode"] != null && filters[filterNum]["courseCode"] != offBlockID && filters[filterNum]["blockNumber"] != null) ? blockArrays[parseInt(filters[filterNum]["blockNumber"])][filters[filterNum]["courseCode"]] : []
  }
  else if (filters[filterNum]["courseCode"] != offBlockID)
  {
    teachersToSelect = selectedTeachers[selectedCourseCodes.indexOf(filters[filterNum]["courseCode"])]
  }
  else
  {
    teachersToSelect = []
  }
  for (var teacherNum = 0; teacherNum < teachersToSelect.length; teacherNum++)
  {
    let teacherName = teachersToSelect[teacherNum]
    teacherFilterSelect.append($('<option>',
    {
      value: window.btoa(teacherName),
      text: teacherName
    }))
  }
}

function addDefaultFilterBlockOptions(blockFilterSelect)
{
  blockFilterSelect.append($('<option>',
  {
    value: "none",
    text: "None"
  }))
  blockFilterSelect.append($('<option>',
  {
    value: "any",
    text: "Any"
  }))
}

function addDefaultFilterTeacherOptions(teacherFilterSelect)
{
  teacherFilterSelect.append($('<option>',
  {
    value: "none",
    text: "None"
  }))
  teacherFilterSelect.append($('<option>',
  {
    value: window.btoa("any"),
    text: "Any"
  }))
}

function addFilter()
{
  var filterSelection = $(".filterSelection")
  $("#filterBreaks0").remove()
  $("#addFilterButton").remove()
  $("#removeFilterButton").remove()
  $("#filterBreaks1").remove()

  filters.push({})

  addFilterSelectHTML(filters.length - 1)

  filterSelection.append("<span id='filterBreaks0'><br></span>")
  filterSelection.append("<button id='addFilterButton' onclick='addFilter()'>Add Filter</button>")
  filterSelection.append("<button id='removeFilterButton' onclick='removeFilter()'>Remove Filter</button>")
  filterSelection.append("<span id='filterBreaks1'><br><br></span>")
}

function removeFilter()
{
  $("#filterRow" + (parseInt(filters.length - 1)).toString()).remove()
  $("#filterBreak" + (parseInt(filters.length - 1)).toString()).remove()

  var filterToRemove = filters.concat().reverse()[0]
  var shouldReload = (filterToRemove["courseCode"] != undefined && filterToRemove["blockNumber"] != undefined && filterToRemove["teacher"] != undefined)

  filters.splice(filters.length - 1, 1)

  if (shouldReload)
  {
    justRemovedFilter = true
    loadSchedules()
  }
  else if (filters.length == 0)
  {
    addFilter()
  }
}

//MARK: - Sessions

function saveSession(id)
{
  if (id == null || id == "")
  {
    return
  }

  console.log("Saving Data...")

  var checkedSelectedTeachers = selectedTeachers.concat()
  for (teacherArrayNum in checkedSelectedTeachers)
  {
    for (teacherNum in checkedSelectedTeachers[teacherArrayNum])
    {
      checkedSelectedTeachers[teacherArrayNum][teacherNum] = checkedSelectedTeachers[teacherArrayNum][teacherNum].replace(new RegExp("\"", 'g'), "\"")
    }
  }

  var dataToSave = {
    "command": "save",
    "id": id,
    "coursesJSON": JSON.stringify(selectedCourseCodes),
    "teachersJSON": JSON.stringify(checkedSelectedTeachers),
    "offBlocksJSON": JSON.stringify(selectedOffBlocks),
    "filtersJSON": JSON.stringify(filters),
    "favoriteSchedulesJSON": JSON.stringify(favoriteSchedules)
  }
  console.log(dataToSave)

  $.post(sessionSource, dataToSave, function(data)
  {
    console.log("Data Saved!")
  })
}

function loadSession(id, completion, isShare)
{
  if (id == null || id == "")
  {
    return
  }

  if (isShare == null || !isShare)
  {
    $.post(sessionSource,
    {
      "command": "load",
      "id": id
    }, function(data)
    {
      loadSessionJSON(data)
      completion ? completion() : false
    })
  }
  else
  {
    $.post(sessionSource,
    {
      "command": "loadShare",
      "shareUUID": id
    }, function(data)
    {
      loadSessionJSON(data)
      completion ? completion() : false
    })
  }
}

function loadSessionJSON(json)
{
  if (json != null && json.length >= 1)
  {
    selectedCourseCodes = JSON.parse(json[0]["coursesJSON".toLowerCase()] ? json[0]["coursesJSON".toLowerCase()] : "[]")
    selectedTeachers = JSON.parse(json[0]["teachersJSON".toLowerCase()] ? json[0]["teachersJSON".toLowerCase()] : "[]")
    selectedOffBlocks = JSON.parse(json[0]["offBlocksJSON".toLowerCase()] ? json[0]["offBlocksJSON".toLowerCase()] : "[]")
    filters = JSON.parse(json[0]["filtersJSON".toLowerCase()] ? json[0]["filtersJSON".toLowerCase()] : "[]")
    favoriteSchedules = JSON.parse(json[0]["favoriteSchedulesJSON".toLowerCase()] ? json[0]["favoriteSchedulesJSON".toLowerCase()] : "[]")
  }
}

function shareSession(id)
{
  if (id == null || id == "")
  {
    return
  }

  var dataToSend = {
    "command": "share",
    "id": id
  }

  $.post(sessionSource, dataToSend, function(data) {
    shareUUID = data[0]["shareUUID".toLowerCase()]
  }).done(function() {
    $("#sessionShare").show()
    $("#sessionShare").val(window.location.protocol + "//" + window.location.host + window.location.pathname + "?shareUUID=" + shareUUID)
  })
}

function copySession()
{
  $("#sessionShare")[0].focus()
  $("#sessionShare")[0].select()
  if (document.execCommand('Copy'))
    alert("Copied!")
}

function postWithPromise(source, dataToSend, completion)
{
  var postPromise = new Promise(function(resolve, reject) {
    $.post(source, dataToSend, function(data)
    {
      completion(data)
      resolve()
    })
  })

  return postPromise
}
