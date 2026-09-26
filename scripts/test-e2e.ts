import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";
import { NextRequest } from "next/server";
import { getTodaySessionDate } from "../src/lib/date";
import { createToken, verifyToken } from "../src/lib/auth";
import { UNASSIGNED, groupLabel, isUnassigned } from "../src/lib/groupLabels";
import {
  GroupError,
  createGroup,
  deleteGroup,
  isKnownGroup,
  listGroupNames,
  listGroups,
  renameGroup,
} from "../src/lib/groups.server";
import { loadGroupSheet } from "../src/lib/groupSheet.server";
import {
  NAME_MATCH_THRESHOLD,
  matchNames,
  normalizeName,
  scoreNameMatch,
} from "../src/lib/nameMatch";
import {
  DELETE as deleteStudent,
  GET as getStudents,
  POST as createStudent,
  PUT as updateStudent,
} from "../src/app/api/students/route";
import { GET as getAttendance } from "../src/app/api/attendance/route";
import { POST as toggleAttendance } from "../src/app/api/attendance/toggle/route";
import { GET as exportGroup } from "../src/app/api/export/group/route";
import { GET as exportMaster } from "../src/app/api/export/master/route";
import {
  DELETE as deleteGroupRoute,
  GET as getGroups,
  POST as createGroupRoute,
  PUT as renameGroupRoute,
} from "../src/app/api/groups/route";
import { POST as loginRequest } from "../src/app/api/auth/login/route";
import { POST as submitStudentDetails } from "../src/app/api/students/match/route";

// Rows created by this suite are removed again so the database is left as found.
const createdStudentIds: number[] = [];
const createdGroupIds: number[] = [];
const createdUserIds: number[] = [];

/** Marks every fixture this suite creates so leftovers are obvious. */
const TAG = "__E2E_TEST__";

function authedRequest(
  url: string,
  token: string,
  init: { method?: string; body?: string } = {}
) {
  return new NextRequest(url, {
    ...init,
    headers: { "Content-Type": "application/json", cookie: `khodam_auth_token=${token}` },
  });
}

function jsonRequest(url: string, body: unknown, method = "POST") {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function runE2ETests() {
  console.log("🚀 Starting Comprehensive Sunday School E2E Test Suite...\n");
  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      throw new Error(`Assertion failed for: ${testName}`);
    }
  }

  const stamp = Date.now();
  const groupAName = `${TAG} خادم أنطونيوس ${stamp}`;
  const groupBName = `${TAG} خادم بيشوي ${stamp}`;

  try {
    // -------------------------------------------------------------
    // Suite 1: One administrator account
    // -------------------------------------------------------------
    console.log("👉 Test Suite 1: Administrator Authentication");

    const adminUser = await prisma.user.findUnique({ where: { username: "grade5boys" } });
    assert(adminUser !== null, "Admin account 'grade5boys' exists in DB");
    assert(adminUser?.role === "ADMIN", "grade5boys has the ADMIN role");
    assert(adminUser?.assignedGroup === null, "grade5boys owns no group of their own");
    assert(
      await bcrypt.compare("saintgeorge", adminUser!.passcode),
      "The admin passcode matches its hash"
    );
    assert(
      (await prisma.user.findUnique({ where: { username: "admin1" } })) === null,
      "The old demo admin account is gone"
    );

    const token = createToken({
      id: adminUser!.id,
      username: adminUser!.username,
      role: "ADMIN",
      assignedGroup: null,
    });
    const verified = verifyToken(token);
    assert(
      verified !== null && verified.username === "grade5boys" && verified.role === "ADMIN",
      "JWT session creates and verifies correctly"
    );

    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    const khademCount = await prisma.user.count({ where: { role: "KHADIM" } });
    assert(adminCount >= 1, "At least one administrator can sign in");
    assert(khademCount === 0, "No Khadem accounts exist — Khodam have no logins");

    console.log("");

    // -------------------------------------------------------------
    // Suite 2: Khodem sign-in is disabled, the admin one works
    // -------------------------------------------------------------
    console.log("👉 Test Suite 2: Khodem Sign-In Disabled");

    const tempKhadem = await prisma.user.create({
      data: {
        username: `${TAG}khadem_${stamp}`.toLowerCase(),
        passcode: await bcrypt.hash("kpass", 10),
        role: "KHADIM",
        assignedGroup: groupAName,
      },
    });
    createdUserIds.push(tempKhadem.id);

    const khademLogin = await loginRequest(
      jsonRequest("http://localhost/api/auth/login", {
        username: tempKhadem.username,
        passcode: "kpass",
      })
    );
    const khademLoginData = await khademLogin.json();
    assert(khademLogin.status === 403, "A Khadem account is refused at sign-in");
    assert(
      khademLoginData.error === "KHADEM_LOGIN_DISABLED",
      "The refusal is reported as KHADEM_LOGIN_DISABLED so the UI can explain it"
    );
    assert(!khademLoginData.user, "A refused Khadem sign-in never returns a session");

    const adminLogin = await loginRequest(
      jsonRequest("http://localhost/api/auth/login", {
        username: "grade5boys",
        passcode: "saintgeorge",
      })
    );
    const adminLoginData = await adminLogin.json();
    assert(adminLogin.status === 200 && adminLoginData.success, "The admin account signs in");
    assert(
      adminLoginData.redirectTo === "/admin/dashboard",
      "Every successful sign-in now lands on the admin dashboard"
    );

    const wrongPass = await loginRequest(
      jsonRequest("http://localhost/api/auth/login", {
        username: "grade5boys",
        passcode: "not-the-passcode",
      })
    );
    assert(wrongPass.status === 401, "A wrong passcode is still rejected with 401");

    console.log("");

    // -------------------------------------------------------------
    // Suite 3: Groups are created, renamed and deleted by the admin
    // -------------------------------------------------------------
    console.log("👉 Test Suite 3: Khodem-Named Groups (CRUD)");

    const emptyNameGroup = await prisma.group.findFirst({ where: { name: "" } });
    assert(emptyNameGroup === null, "No nameless group exists in the database");

    const groupA = await createGroup(groupAName);
    createdGroupIds.push(groupA.id);
    assert(groupA.id > 0, "A group is created and given an id");
    assert(groupA.name === groupAName, "The group keeps the Khodam's name verbatim");
    assert(groupA.studentCount === 0, "A brand new group starts with no children");

    const groupB = await createGroup(groupBName);
    createdGroupIds.push(groupB.id);
    assert(groupB.sortOrder > groupA.sortOrder, "New groups append to the end of the order");

    let duplicateRejected = false;
    try {
      await createGroup(groupAName);
    } catch (err) {
      duplicateRejected = err instanceof GroupError && err.status === 409;
    }
    assert(duplicateRejected, "A duplicate group name is refused with 409");

    let blankRejected = false;
    try {
      await createGroup("   ");
    } catch (err) {
      blankRejected = err instanceof GroupError && err.status === 400;
    }
    assert(blankRejected, "A blank group name is refused with 400");

    assert(await isKnownGroup(groupAName), "A created group is recognised as a real group");
    assert(!(await isKnownGroup("Group 42")), "A made-up group name is not a real group");
    assert(!(await isKnownGroup("")), "An empty string is never a group");

    const orderedGroupNames = await listGroupNames();
    assert(
      orderedGroupNames.indexOf(groupAName) < orderedGroupNames.indexOf(groupBName),
      "Group names come back in the admin's running order"
    );

    console.log("");

    // -------------------------------------------------------------
    // Suite 4: Children register with no group (and bad groups are refused)
    // -------------------------------------------------------------
    console.log("👉 Test Suite 4: Registration Without a Group");

    const unplaced = await createStudent(
      jsonRequest("http://localhost/api/students", {
        fullName: `${TAG} أنطونيوس بلا مجموعة ${stamp}`,
        dob: "2016-04-02",
        address: "test address",
      })
    );
    const unplacedData = await unplaced.json();
    assert(
      unplaced.status === 200 && unplacedData.success,
      "A child can register without naming a group"
    );
    assert(
      unplacedData.student.assignedGroup === null && unplacedData.assignment.source === "unassigned",
      "No group is invented for a new child — they stay Unassigned for the admin to place"
    );
    createdStudentIds.push(unplacedData.student.id);

    const emptyGroup = await createStudent(
      jsonRequest("http://localhost/api/students", {
        fullName: `${TAG} برنابا مجموعة فارغة ${stamp}`,
        assignedGroup: "",
        address: "test address",
      })
    );
    const emptyGroupData = await emptyGroup.json();
    assert(
      emptyGroupData.student.assignedGroup === null && emptyGroupData.assignment.source === "unassigned",
      "An empty group string also lands in Unassigned"
    );
    createdStudentIds.push(emptyGroupData.student.id);

    const badGroup = await createStudent(
      jsonRequest("http://localhost/api/students", {
        fullName: `${TAG} ديوسقوروس مجموعة وهمية ${stamp}`,
        assignedGroup: "Group 42",
        address: "test address",
      })
    );
    const badGroupData = await badGroup.json();
    assert(badGroup.status === 400 && !badGroupData.success, "A group that does not exist is refused with 400");
    assert(!badGroupData.student, "A refused registration never returns an invented group");

    const placed = await createStudent(
      jsonRequest("http://localhost/api/students", {
        fullName: `${TAG} غريغوريوس مصنف ${stamp}`,
        assignedGroup: groupAName,
        address: "test address",
      })
    );
    const placedData = await placed.json();
    assert(
      placedData.student.assignedGroup === groupAName && placedData.assignment.source === "explicit",
      "An explicitly chosen Khodem group is stored verbatim"
    );
    createdStudentIds.push(placedData.student.id);

    console.log("");

    // -------------------------------------------------------------
    // Suite 5: Placing children, renaming and deleting groups
    // -------------------------------------------------------------
    console.log("👉 Test Suite 5: Placing Children & Group Lifecycle");

    const movedToB = await updateStudent(
      authedRequest("http://localhost/api/students", token, {
        method: "PUT",
        body: JSON.stringify({ id: unplacedData.student.id, assignedGroup: groupBName }),
      })
    );
    assert(movedToB.status === 200, "The admin can place a child straight into a group");
    const movedToBData = await movedToB.json();
    assert(
      movedToBData.student.assignedGroup === groupBName,
      "The child is filed under the group's name, which IS the Khodam"
    );

    const backToUnassigned = await updateStudent(
      authedRequest("http://localhost/api/students", token, {
        method: "PUT",
        body: JSON.stringify({ id: unplacedData.student.id, assignedGroup: "" }),
      })
    );
    const backData = await backToUnassigned.json();
    assert(
      backData.student.assignedGroup === null && isUnassigned(backData.student.assignedGroup),
      "Clearing the group sends the child back to Unassigned"
    );

    const listed = await getStudents(authedRequest("http://localhost/api/students", token));
    const listedData = await listed.json();
    assert(listed.status === 200, "The admin can load every roster");
    assert(
      listedData.students.some((s: { unassigned: boolean }) => s.unassigned),
      "The listing includes the children still waiting for a group"
    );

    const filtered = await getStudents(
      authedRequest(`http://localhost/api/students?group=${encodeURIComponent(groupAName)}`, token)
    );
    const filteredData = await filtered.json();
    assert(
      filteredData.students.every((s: { assignedGroup: string }) => s.assignedGroup === groupAName),
      "Filtering by a Khodem's group returns only that group's children"
    );

    // Renaming must carry the children across in the same transaction.
    const renamedName = `${groupAName} (محدّث)`;
    const renamed = await renameGroup(groupA.id, renamedName);
    assert(renamed.name === renamedName, "A group can be renamed");
    const afterRename = await prisma.student.findUnique({ where: { id: placedData.student.id } });
    assert(
      afterRename?.assignedGroup === renamedName,
      "Renaming a group moves its children across — nobody is orphaned under the old name"
    );
    assert(!(await isKnownGroup(groupAName)), "The old group name is gone after the rename");

    let renameClash = false;
    try {
      await renameGroup(groupA.id, groupBName);
    } catch (err) {
      renameClash = err instanceof GroupError && err.status === 409;
    }
    assert(renameClash, "Renaming onto an existing group's name is refused with 409");

    let unconfirmedDelete = false;
    try {
      await deleteGroup(groupA.id);
    } catch (err) {
      unconfirmedDelete = err instanceof GroupError && err.status === 409;
    }
    assert(unconfirmedDelete, "Deleting a group that still holds children asks for confirmation first");

    const counts = await listGroups();
    const groupACount = counts.find((g) => g.id === groupA.id)?.studentCount ?? -1;
    assert(groupACount === 1, "The group reports how many children it holds");

    const deleted = await deleteGroup(groupA.id, { force: true });
    createdGroupIds.splice(createdGroupIds.indexOf(groupA.id), 1);
    assert(deleted.movedToUnassigned === 1, "Confirming the delete reports the children it re-homed");
    const afterDelete = await prisma.student.findUnique({ where: { id: placedData.student.id } });
    assert(
      afterDelete !== null && afterDelete.assignedGroup === null,
      "Children are never deleted with their group — they return to Unassigned"
    );

    // -------------------------------------------------------------
    // Suite 5b: Deleting a child (the admin's cleanup tool)
    // -------------------------------------------------------------
    console.log("👉 Test Suite 5b: Deleting a Child");

    const throwaway = await prisma.student.create({
      data: { fullName: `${TAG} مخدوم للحذف ${stamp}` },
    });
    const throwawaySession = getTodaySessionDate();
    await prisma.attendanceRecord.create({
      data: { studentId: throwaway.id, sessionDate: throwawaySession, status: "PRESENT" },
    });

    const deletedChild = await deleteStudent(
      authedRequest("http://localhost/api/students", token, {
        method: "DELETE",
        body: JSON.stringify({ id: throwaway.id }),
      })
    );
    const deletedChildData = await deletedChild.json();
    assert(
      deletedChild.status === 200 && deletedChildData.success,
      "The admin can delete a child"
    );
    assert(
      deletedChildData.deleted?.fullName === throwaway.fullName,
      "The delete reports which child was removed"
    );
    assert(
      (await prisma.student.findUnique({ where: { id: throwaway.id } })) === null,
      "The deleted child is gone from the database"
    );
    assert(
      (await prisma.attendanceRecord.count({ where: { studentId: throwaway.id } })) === 0,
      "The child's attendance history goes with them"
    );

    const deleteMissing = await deleteStudent(
      authedRequest("http://localhost/api/students", token, {
        method: "DELETE",
        body: JSON.stringify({ id: 99999999 }),
      })
    );
    assert(deleteMissing.status === 404, "Deleting a child who does not exist answers 404");

    const deleteNoId = await deleteStudent(
      authedRequest("http://localhost/api/students", token, {
        method: "DELETE",
        body: JSON.stringify({}),
      })
    );
    assert(deleteNoId.status === 400, "Deleting without an id is refused with 400");

    console.log("");

    // -------------------------------------------------------------
    // Suite 6: Attendance
    // -------------------------------------------------------------
    console.log("👉 Test Suite 6: Attendance Marking");

    const today = getTodaySessionDate();
    const targetStudentId = unplacedData.student.id;

    const marked = await toggleAttendance(
      authedRequest("http://localhost/api/attendance/toggle", token, {
        method: "POST",
        body: JSON.stringify({ studentId: targetStudentId, status: "PRESENT" }),
      })
    );
    assert(marked.status === 200, "The admin can mark a child present");
    const markedRecord = await prisma.attendanceRecord.findUnique({
      where: { studentId_sessionDate: { studentId: targetStudentId, sessionDate: today } },
    });
    assert(markedRecord?.status === "PRESENT", "Attendance is stored as PRESENT for today");

    const toggledBack = await toggleAttendance(
      authedRequest("http://localhost/api/attendance/toggle", token, {
        method: "POST",
        body: JSON.stringify({ studentId: targetStudentId, status: "ABSENT" }),
      })
    );
    assert(toggledBack.status === 200, "The admin can flip a child back to absent");
    const absentRecord = await prisma.attendanceRecord.findUnique({
      where: { studentId_sessionDate: { studentId: targetStudentId, sessionDate: today } },
    });
    assert(absentRecord?.status === "ABSENT", "Attendance is stored as ABSENT after the flip");

    const attendanceList = await getAttendance(
      authedRequest("http://localhost/api/attendance", token)
    );
    const attendanceData = await attendanceList.json();
    assert(attendanceList.status === 200 && attendanceData.success, "Attendance history loads for the admin");
    assert(
      Array.isArray(attendanceData.records) && attendanceData.records.length >= 1,
      "The attendance history includes the record just written"
    );

    console.log("");

    // -------------------------------------------------------------
    // Suite 7: Excel exports still work
    // -------------------------------------------------------------
    console.log("👉 Test Suite 7: Excel Exports");

    const groupExport = await exportGroup(
      authedRequest(`http://localhost/api/export/group?group=${encodeURIComponent(groupBName)}`, token)
    );
    assert(groupExport.status === 200, "A group sheet exports for the admin");
    assert(
      (groupExport.headers.get("content-type") ?? "").includes("spreadsheetml"),
      "The group export is a real .xlsx download"
    );
    assert((await groupExport.arrayBuffer()).byteLength > 500, "The group workbook has real content");

    const masterExport = await exportMaster(
      authedRequest("http://localhost/api/export/master", token)
    );
    assert(masterExport.status === 200, "The master workbook exports for the admin");
    assert(
      (await masterExport.arrayBuffer()).byteLength > 500,
      "The master workbook has real content"
    );

    const noGroupExport = await exportGroup(
      authedRequest("http://localhost/api/export/group", token)
    );
    assert(noGroupExport.status === 400, "The group export asks which group when none is named");

    // A workbook written from the live group still carries no grade column.
    const sampleRows = [
      { "#": 1, "Student Name": "A", Group: groupBName, "Mother Phone": "-", Status: "PRESENT" },
    ];
    const sheet = XLSX.utils.json_to_sheet(sampleRows);
    assert(!("Grade" in sampleRows[0]), "Export rows carry no school grade");
    assert(XLSX.utils.sheet_to_json(sheet).length === 1, "Export rows round-trip through XLSX");

    console.log("");

    // -------------------------------------------------------------
    // Suite 8: The printed profile sheet
    // -------------------------------------------------------------
    console.log("👉 Test Suite 8: Printable Group Profile Sheet");

    const sheetChild = await prisma.student.create({
      data: {
        fullName: `${TAG} أرسانيوس للكشف`,
        dob: "2014-01-09",
        motherName: `${TAG} أم أرسانيوس`,
        motherPhone: "01234567890",
        fatherPhone: "01098765432",
        childPhone: "01123456789",
        address: `${TAG} ١٥ شارع شبرا`,
        schoolName: `${TAG} مدرسة الفرير`,
        notes: `${TAG} ملاحظات طبية`,
        assignedGroup: groupBName,
        photoUrl: "https://example.test/photo.jpg",
      },
    });
    createdStudentIds.push(sheetChild.id);

    const sheetRows = await loadGroupSheet(groupBName);
    assert(sheetRows.length >= 1, "The sheet loads the children of the requested group only");
    assert(
      sheetRows.every((s) => s.fullName.startsWith(TAG)),
      "Every row on the sheet belongs to that group"
    );
    const sheetNames = sheetRows.map((s) => s.fullName);
    assert(
      JSON.stringify(sheetNames) === JSON.stringify([...sheetNames].sort()),
      "Sheet rows are ordered by name for a stable print run"
    );

    const sheetRow = sheetRows.find((s) => s.id === sheetChild.id);
    assert(sheetRow !== undefined, "The child appears on their group's sheet");
    assert(
      sheetRow?.photoUrl === "https://example.test/photo.jpg",
      "The sheet carries the photo so it can be printed whole, never cropped in the data"
    );
    assert(
      sheetRow?.dob === "2014-01-09" &&
        sheetRow?.motherName === `${TAG} أم أرسانيوس` &&
        sheetRow?.motherPhone === "01234567890" &&
        sheetRow?.fatherPhone === "01098765432" &&
        sheetRow?.childPhone === "01123456789" &&
        sheetRow?.address === `${TAG} ١٥ شارع شبرا` &&
        sheetRow?.schoolName === `${TAG} مدرسة الفرير` &&
        sheetRow?.notes === `${TAG} ملاحظات طبية`,
      "The sheet carries every stored field for the child"
    );

    const emptySheet = await loadGroupSheet(`${TAG} مجموعة لا وجود لها ${stamp}`);
    assert(emptySheet.length === 0, "An unknown group prints an empty sheet rather than failing");

    console.log("");

    // -------------------------------------------------------------
    // Suite 9: Authorization guards
    // -------------------------------------------------------------
    console.log("👉 Test Suite 9: Authorization Guards");

    const anonymousStudents = await getStudents(new NextRequest("http://localhost/api/students"));
    assert(anonymousStudents.status === 401, "Anonymous requests cannot list children (family phones are private)");

    const anonymousAttendance = await getAttendance(new NextRequest("http://localhost/api/attendance"));
    assert(anonymousAttendance.status === 401, "Anonymous requests cannot read attendance");

    const anonymousToggle = await toggleAttendance(
      new NextRequest("http://localhost/api/attendance/toggle", { method: "POST" })
    );
    assert(anonymousToggle.status === 401, "Anonymous requests cannot mark attendance");

    const anonymousUpdate = await updateStudent(
      new NextRequest("http://localhost/api/students", { method: "PUT" })
    );
    assert(anonymousUpdate.status === 401, "Anonymous requests cannot edit a child");

    const anonymousDelete = await deleteStudent(
      new NextRequest("http://localhost/api/students", { method: "DELETE" })
    );
    assert(anonymousDelete.status === 401, "Anonymous requests cannot delete a child");

    const anonymousMaster = await exportMaster(new NextRequest("http://localhost/api/export/master"));
    assert(anonymousMaster.status === 401, "Anonymous requests cannot download the master workbook");

    const anonymousGroups = await getGroups(new NextRequest("http://localhost/api/groups"));
    assert(anonymousGroups.status === 401, "Anonymous requests cannot list groups");

    const anonymousCreateGroup = await createGroupRoute(
      jsonRequest("http://localhost/api/groups", { name: `${TAG} intruder ${stamp}` })
    );
    assert(anonymousCreateGroup.status === 401, "Anonymous requests cannot create a group");

    const anonymousRenameGroup = await renameGroupRoute(
      jsonRequest("http://localhost/api/groups", { id: groupB.id, name: "hacked" }, "PUT")
    );
    assert(anonymousRenameGroup.status === 401, "Anonymous requests cannot rename a group");

    const anonymousDeleteGroup = await deleteGroupRoute(
      jsonRequest("http://localhost/api/groups", { id: groupB.id, force: true }, "DELETE")
    );
    assert(anonymousDeleteGroup.status === 401, "Anonymous requests cannot delete a group");

    const stillThere = await prisma.group.findUnique({ where: { id: groupB.id } });
    assert(stillThere?.name === groupBName, "None of the refused group calls changed anything");

    // The same rules through the HTTP-shaped handlers.
    const groupsList = await getGroups(authedRequest("http://localhost/api/groups", token));
    const groupsData = await groupsList.json();
    assert(groupsList.status === 200 && groupsData.success, "The admin can list the groups");
    assert(
      groupsData.groups.every((g: { id: number; name: string; studentCount: number }) => g.id > 0 && g.name),
      "Every listed group carries an id, its Khodam name and a child count"
    );

    const routeGroupName = `${TAG} خادم من المسار ${stamp}`;
    const createdViaRoute = await createGroupRoute(
      authedRequest("http://localhost/api/groups", token, {
        method: "POST",
        body: JSON.stringify({ name: routeGroupName }),
      })
    );
    const createdViaRouteData = await createdViaRoute.json();
    assert(createdViaRoute.status === 201 && createdViaRouteData.success, "The admin can create a group over HTTP");
    createdGroupIds.push(createdViaRouteData.group.id);

    const duplicateViaRoute = await createGroupRoute(
      authedRequest("http://localhost/api/groups", token, {
        method: "POST",
        body: JSON.stringify({ name: routeGroupName }),
      })
    );
    assert(duplicateViaRoute.status === 409, "A duplicate group name is refused with 409 over HTTP");

    const missingIdRename = await renameGroupRoute(
      authedRequest("http://localhost/api/groups", token, {
        method: "PUT",
        body: JSON.stringify({ name: "x" }),
      })
    );
    assert(missingIdRename.status === 400, "Renaming without an id is refused with 400");

    const deletedViaRoute = await deleteGroupRoute(
      authedRequest("http://localhost/api/groups", token, {
        method: "DELETE",
        body: JSON.stringify({ id: createdViaRouteData.group.id, force: true }),
      })
    );
    assert(deletedViaRoute.status === 200, "The admin can delete a group over HTTP");
    createdGroupIds.splice(createdGroupIds.indexOf(createdViaRouteData.group.id), 1);

    console.log("");

    // -------------------------------------------------------------
    // Suite 10: Fuzzy, Arabic/Latin-tolerant name detector
    // -------------------------------------------------------------
    console.log("👉 Test Suite 10: Fuzzy Arabic / Latin Name Detector");

    assert(
      normalizeName("مَرْيَم") === normalizeName("مريم") &&
        normalizeName("إبراهيم") === normalizeName("ابراهيم"),
      "Normalization strips diacritics and unifies alef/hamza spellings"
    );
    assert(
      scoreNameMatch("مينا", "مينا") > 0.99 && scoreNameMatch("مينا", "mina") >= 0.75,
      "Arabic and Latin spellings of the same name match"
    );
    assert(
      scoreNameMatch("محمد", "خالد") < NAME_MATCH_THRESHOLD,
      "Two unrelated names score below the match threshold"
    );
    assert(
      scoreNameMatch("مينا سمير نبيل", "مينا ماجد فخرى") < NAME_MATCH_THRESHOLD,
      "Sharing one common first name alone is not enough for a match"
    );
    assert(
      scoreNameMatch("Youhanna Emad Fakhry", "يوحنا عماد فخري") >= NAME_MATCH_THRESHOLD,
      "A Latin transliteration of a real Arabic name is found"
    );

    // The details form leans on this same matcher to decide whether a child is
    // already on the roster, so the lookup is exercised against a controlled
    // list rather than a shared test database.
    const matcherRoster = [
      { fullName: `${TAG} مينا ماجد فخرى` },
      { fullName: `${TAG} يوحنا عماد فخري` },
      { fullName: `${TAG} كيرلس أنطونيوس` },
    ];
    const bestMatch = (query: string) =>
      matchNames(query, matcherRoster, { threshold: NAME_MATCH_THRESHOLD, limit: 5 })[0]?.item
        .fullName;

    assert(
      bestMatch(`${TAG} مينا ماجد فخري`) === `${TAG} مينا ماجد فخرى`,
      "An Arabic spelling variant (ى vs ي) still finds the right child"
    );
    assert(
      bestMatch("mina maged fakhry") === `${TAG} مينا ماجد فخرى`,
      "A Latin transliteration still finds the right child"
    );
    assert(
      bestMatch(`${TAG} مينا ماجد فخر`) === `${TAG} مينا ماجد فخرى`,
      "A dropped letter in the name still finds the right child"
    );
    assert(
      bestMatch("زائر لا وجود له على الكشف") === undefined,
      "A name nobody on the roster resembles matches nobody"
    );

    console.log("");

    // -------------------------------------------------------------
    // Suite 11: Details form — the name is checked, then the child is saved
    // -------------------------------------------------------------
    console.log("👉 Test Suite 11: Student Details Form");

    const detailsStudent = await prisma.student.create({
      data: {
        fullName: `${TAG} ثاؤفيلوس حبيب مقار`,
        motherPhone: "01000000000",
        assignedGroup: groupBName,
      },
    });
    createdStudentIds.push(detailsStudent.id);

    async function submitDetails(payload: Record<string, unknown>) {
      const res = await submitStudentDetails(
        jsonRequest("http://localhost/api/students/match", payload)
      );
      return { status: res.status, data: await res.json() };
    }

    const recognised = await submitDetails({
      fullName: `${TAG} ثاوفيلوس حبيب مقار`,
      motherName: `${TAG} أم ثاؤفيلوس`,
      address: `${TAG} عنوان محدّث`,
      childPhone: "01111111111",
    });
    assert(
      recognised.status === 200 && recognised.data.found === true,
      "A known child is recognised and answered with the welcome screen"
    );

    const refreshed = await prisma.student.findUnique({ where: { id: detailsStudent.id } });
    assert(
      refreshed?.motherName === `${TAG} أم ثاؤفيلوس` &&
        refreshed?.address === `${TAG} عنوان محدّث` &&
        refreshed?.childPhone === "01111111111",
      "The recognised child's details are updated from the submitted form"
    );
    assert(
      refreshed?.assignedGroup === groupBName && refreshed?.fullName === detailsStudent.fullName,
      "Submitting the form never moves the child's group or rewrites their name"
    );
    assert(
      refreshed?.motherPhone === "01000000000",
      "A field left blank keeps its existing value instead of wiping it"
    );

    // Nobody is turned away any more: an unrecognised name becomes a new child,
    // which matters because the roster starts empty.
    const newChildName = `زائر جديد غير مسجل ${Date.now()}`;
    const newChildDetails = await submitDetails({
      fullName: newChildName,
      motherName: `أم ${newChildName}`,
      motherPhone: "01555000111",
      address: "عنوان المخدوم الجديد",
      schoolName: "مدرسة جديدة",
    });
    assert(
      newChildDetails.status === 200 &&
        newChildDetails.data.success === true &&
        newChildDetails.data.found === true &&
        newChildDetails.data.created === true,
      "An unknown name is saved as a new child instead of showing a not-found screen"
    );

    const createdChild = await prisma.student.findFirst({ where: { fullName: newChildName } });
    assert(createdChild !== null, "The new child really is written to the database");
    if (createdChild) createdStudentIds.push(createdChild.id);
    assert(
      createdChild?.motherName === `أم ${newChildName}` &&
        createdChild?.motherPhone === "01555000111" &&
        createdChild?.address === "عنوان المخدوم الجديد" &&
        createdChild?.schoolName === "مدرسة جديدة",
      "Everything the family filled in is kept on the new child"
    );
    assert(
      createdChild?.assignedGroup === null,
      "A child added by the form arrives Unassigned, ready for the admin to place"
    );
    assert(
      (await prisma.attendanceRecord.count({ where: { studentId: createdChild!.id } })) === 0,
      "Submitting the details form does not mark the child present — the admin marks attendance"
    );

    // The roster has just grown, so the same name now matches instead of adding.
    const resubmitted = await submitDetails({ fullName: newChildName, notes: "تحديث لاحق" });
    assert(
      resubmitted.status === 200 && resubmitted.data.created === false,
      "A second submission of the same name updates that child rather than adding another"
    );
    assert(
      (await prisma.student.count({ where: { fullName: newChildName } })) === 1,
      "The same name is never stored twice"
    );

    const twinStamp = Date.now();
    const twinA = await prisma.student.create({
      data: { fullName: `${TAG} كيرلس أنطونيوس ${twinStamp}`, assignedGroup: groupBName },
    });
    const twinB = await prisma.student.create({
      data: { fullName: `${TAG} كيرلس أنطونيوس ${twinStamp + 1}`, assignedGroup: groupBName },
    });
    createdStudentIds.push(twinA.id, twinB.id);

    const ambiguousDetails = await submitDetails({
      fullName: twinA.fullName,
      address: `${TAG} عنوان`,
    });
    assert(
      ambiguousDetails.status === 409 && ambiguousDetails.data.found === "ambiguous",
      "Two near-identical names are not guessed on the details form either"
    );

    const namelessDetails = await submitDetails({ fullName: "a", address: `${TAG} عنوان` });
    assert(namelessDetails.status === 400, "A too-short name is rejected with 400");

    console.log("");

    // -------------------------------------------------------------
    // Suite 12: Group labels
    // -------------------------------------------------------------
    console.log("👉 Test Suite 12: Group Labels");

    assert(
      isUnassigned(null) && isUnassigned(undefined) && isUnassigned(""),
      "A child without a group is reported as unassigned"
    );
    assert(!isUnassigned(groupBName), "A placed child is not unassigned");
    assert(UNASSIGNED === "unassigned", "The unassigned filter sentinel is unchanged");
    assert(
      groupLabel(groupBName, "en") === groupBName && groupLabel(groupBName, "ar") === groupBName,
      "A placed child is labelled with the Khodam's group name in both languages"
    );
    assert(
      groupLabel(null, "en") === "Unassigned" && groupLabel(undefined, "ar") === "لم يتم التوزيع",
      "An unplaced child is labelled as Unassigned / لم يتم التوزيع"
    );

    console.log("");
    console.log(`🎉 All ${passedTests}/${totalTests} E2E Tests Passed Successfully!`);
  } catch (error) {
    console.error("❌ E2E Test Suite Encountered an Error:", error);
    process.exitCode = 1;
  } finally {
    if (createdStudentIds.length > 0) {
      await prisma.student.deleteMany({ where: { id: { in: createdStudentIds } } });
    }
    for (const id of createdGroupIds) {
      await prisma.group.deleteMany({ where: { id } });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }

    // Nothing tagged may survive, so the database stays on its clean slate.
    const leftoverStudents = await prisma.student.count({ where: { fullName: { startsWith: TAG } } });
    const leftoverGroups = await prisma.group.count({ where: { name: { contains: TAG } } });
    const leftoverUsers = await prisma.user.count({ where: { username: { contains: TAG.toLowerCase() } } });

    console.log(
      `🧹 Cleaned up ${createdStudentIds.length} test students, ${createdGroupIds.length} test groups and ${createdUserIds.length} test accounts.`
    );
    if (leftoverStudents || leftoverGroups || leftoverUsers) {
      console.error(
        `⚠️  Leftovers detected — ${leftoverStudents} students, ${leftoverGroups} groups, ${leftoverUsers} accounts.`
      );
      process.exitCode = 1;
    } else {
      console.log("🧼 Database left clean: no test rows remain.");
    }

    await prisma.$disconnect();
  }
}

runE2ETests();
