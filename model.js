function SchoolCourse(courseArray)
{
  this.departmentNum = courseArray["departmentNumber".toLowerCase()]
  this.courseCode = courseArray["courseCode".toLowerCase()]
  this.courseName = courseArray["courseName".toLowerCase()]
  this.semester = courseArray["semester".toLowerCase()]
}

function SchoolBlock(blockArray)
{
  this.sectionNumber = blockArray["sectionNumber".toLowerCase()]
  this.blockCode = blockArray["blockCode".toLowerCase()]
  this.blockNum = blockArray["blockNum".toLowerCase()]
  this.roomNum = blockArray["roomNum".toLowerCase()]
  this.teacher = blockArray["teacher".toLowerCase()]
  this.courseCode = blockArray["courseCode".toLowerCase()]
}

function SchoolDepartment(departmentArray)
{
  this.departmentTitle = departmentArray["departmentTitle".toLowerCase()]
  this.departmentNum = departmentArray["departmentNumber".toLowerCase()]
}
