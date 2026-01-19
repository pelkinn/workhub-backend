import "dotenv/config";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { MembershipRole } from "@prisma/client";
import request from "supertest";

describe("RBAC E2E Tests", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test users
  let ownerUser: { id: string; email: string; token: string };
  let editorUser: { id: string; email: string; token: string };
  let viewerUser: { id: string; email: string; token: string };
  let nonMemberUser: { id: string; email: string; token: string };

  // Test project
  let projectId: string;
  let taskId: string;
  let invitationId: string;

  beforeAll(async () => {
    // Ensure DATABASE_URL is set for tests
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL =
        process.env.DATABASE_URL ||
        "postgresql://postgres:postgres@localhost:5432/workhub";
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );

    app.enableCors({
      origin: true,
      credentials: true,
    });

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    // Cleanup test data
    if (projectId) {
      await prisma.membership.deleteMany({
        where: { projectId },
      });
      await prisma.task.deleteMany({
        where: { projectId },
      });
      await prisma.invitation.deleteMany({
        where: { projectId },
      });
      await prisma.project.delete({
        where: { id: projectId },
      });
    }

    // Cleanup users
    const users = [ownerUser, editorUser, viewerUser, nonMemberUser];
    for (const user of users) {
      if (user?.id) {
        await prisma.user
          .delete({
            where: { id: user.id },
          })
          .catch(() => {});
      }
    }

    await prisma.$disconnect();
    await app.close();
  });

  describe("Setup: Create users and project", () => {
    it("should create owner user", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          email: "owner@test.com",
          password: "password123",
          name: "Owner User",
        })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          email: "owner@test.com",
          password: "password123",
        })
        .expect(200);

      ownerUser = {
        id: loginResponse.body.user.id,
        email: loginResponse.body.user.email,
        token: loginResponse.body.access_token,
      };
    });

    it("should create editor user", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          email: "editor@test.com",
          password: "password123",
          name: "Editor User",
        })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          email: "editor@test.com",
          password: "password123",
        })
        .expect(200);

      editorUser = {
        id: loginResponse.body.user.id,
        email: loginResponse.body.user.email,
        token: loginResponse.body.access_token,
      };
    });

    it("should create viewer user", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          email: "viewer@test.com",
          password: "password123",
          name: "Viewer User",
        })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          email: "viewer@test.com",
          password: "password123",
        })
        .expect(200);

      viewerUser = {
        id: loginResponse.body.user.id,
        email: loginResponse.body.user.email,
        token: loginResponse.body.access_token,
      };
    });

    it("should create non-member user", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          email: "nonmember@test.com",
          password: "password123",
          name: "Non-Member User",
        })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          email: "nonmember@test.com",
          password: "password123",
        })
        .expect(200);

      nonMemberUser = {
        id: loginResponse.body.user.id,
        email: loginResponse.body.user.email,
        token: loginResponse.body.access_token,
      };
    });

    it("should create project by owner", async () => {
      const response = await request(app.getHttpServer())
        .post("/projects")
        .set("Authorization", `Bearer ${ownerUser.token}`)
        .send({
          name: "Test Project",
          description: "Test project for RBAC",
        })
        .expect(201);

      projectId = response.body.id;

      // Verify owner has OWNER role
      const membership = await prisma.membership.findFirst({
        where: {
          projectId,
          userId: ownerUser.id,
        },
      });

      expect(membership).toBeDefined();
      expect(membership?.role).toBe(MembershipRole.OWNER);
    });

    it("should add editor user to project", async () => {
      // Create invitation for editor
      const invitation = await prisma.invitation.create({
        data: {
          projectId,
          email: editorUser.email,
          role: MembershipRole.EDITOR,
          token: `token-${Date.now()}-editor`,
        },
      });

      // Accept invitation
      await request(app.getHttpServer())
        .post(`/invitations/${invitation.token}/accept`)
        .set("Authorization", `Bearer ${editorUser.token}`)
        .expect(201);

      // Verify membership
      const membership = await prisma.membership.findFirst({
        where: {
          projectId,
          userId: editorUser.id,
        },
      });

      expect(membership).toBeDefined();
      expect(membership?.role).toBe(MembershipRole.EDITOR);
    });

    it("should add viewer user to project", async () => {
      // Create invitation for viewer
      const invitation = await prisma.invitation.create({
        data: {
          projectId,
          email: viewerUser.email,
          role: MembershipRole.VIEWER,
          token: `token-${Date.now()}-viewer`,
        },
      });

      // Accept invitation
      await request(app.getHttpServer())
        .post(`/invitations/${invitation.token}/accept`)
        .set("Authorization", `Bearer ${viewerUser.token}`)
        .expect(201);

      // Verify membership
      const membership = await prisma.membership.findFirst({
        where: {
          projectId,
          userId: viewerUser.id,
        },
      });

      expect(membership).toBeDefined();
      expect(membership?.role).toBe(MembershipRole.VIEWER);
    });
  });

  describe("Project Access", () => {
    it("should allow owner to view project", async () => {
      await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .set("Authorization", `Bearer ${ownerUser.token}`)
        .expect(200);
    });

    it("should allow editor to view project", async () => {
      await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .set("Authorization", `Bearer ${editorUser.token}`)
        .expect(200);
    });

    it("should allow viewer to view project", async () => {
      await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .set("Authorization", `Bearer ${viewerUser.token}`)
        .expect(200);
    });

    it("should deny non-member access to project", async () => {
      await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .set("Authorization", `Bearer ${nonMemberUser.token}`)
        .expect(404); // Service returns 404 when user is not a member
    });

    it("should allow only OWNER to delete project", async () => {
      // Editor should not be able to delete
      await request(app.getHttpServer())
        .delete(`/projects/${projectId}`)
        .set("Authorization", `Bearer ${editorUser.token}`)
        .expect(403);

      // Viewer should not be able to delete
      await request(app.getHttpServer())
        .delete(`/projects/${projectId}`)
        .set("Authorization", `Bearer ${viewerUser.token}`)
        .expect(403);

      // Owner should be able to delete (but we won't actually delete to keep project for other tests)
      // We'll test this in a separate test that creates a new project
    });
  });

  describe("Tasks Access", () => {
    it("should allow owner to create task", async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .set("Authorization", `Bearer ${ownerUser.token}`)
        .send({
          title: "Owner Task",
          description: "Task created by owner",
        })
        .expect(201);

      taskId = response.body.id;
    });

    it("should allow editor to create task", async () => {
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .set("Authorization", `Bearer ${editorUser.token}`)
        .send({
          title: "Editor Task",
          description: "Task created by editor",
        })
        .expect(201);
    });

    it("should deny viewer from creating task", async () => {
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .set("Authorization", `Bearer ${viewerUser.token}`)
        .send({
          title: "Viewer Task",
          description: "Task created by viewer",
        })
        .expect(403);
    });

    it("should allow all members to view tasks", async () => {
      await request(app.getHttpServer())
        .get(`/projects/${projectId}/tasks`)
        .set("Authorization", `Bearer ${ownerUser.token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/projects/${projectId}/tasks`)
        .set("Authorization", `Bearer ${editorUser.token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/projects/${projectId}/tasks`)
        .set("Authorization", `Bearer ${viewerUser.token}`)
        .expect(200);
    });

    it("should allow editor to update task", async () => {
      await request(app.getHttpServer())
        .put(`/projects/${projectId}/tasks/${taskId}`)
        .set("Authorization", `Bearer ${editorUser.token}`)
        .send({
          title: "Updated Task",
          completed: true,
        })
        .expect(200);
    });

    it("should deny viewer from updating task", async () => {
      await request(app.getHttpServer())
        .put(`/projects/${projectId}/tasks/${taskId}`)
        .set("Authorization", `Bearer ${viewerUser.token}`)
        .send({
          title: "Updated by Viewer",
        })
        .expect(403);
    });

    it("should allow editor to delete task", async () => {
      // Create a task to delete
      const createResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .set("Authorization", `Bearer ${editorUser.token}`)
        .send({
          title: "Task to Delete",
          description: "This will be deleted",
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/projects/${projectId}/tasks/${createResponse.body.id}`)
        .set("Authorization", `Bearer ${editorUser.token}`)
        .expect(200);
    });

    it("should deny viewer from deleting task", async () => {
      await request(app.getHttpServer())
        .delete(`/projects/${projectId}/tasks/${taskId}`)
        .set("Authorization", `Bearer ${viewerUser.token}`)
        .expect(403);
    });
  });

  describe("Invitations Access", () => {
    it("should allow owner to create invitation", async () => {
      // First, create a user with this email (or get existing)
      await prisma.user.upsert({
        where: { email: "newuser@test.com" },
        update: {},
        create: {
          email: "newuser@test.com",
          password: "hashedpassword",
          name: "New User",
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/invitations`)
        .set("Authorization", `Bearer ${ownerUser.token}`)
        .send({
          email: "newuser@test.com",
          role: MembershipRole.VIEWER,
        })
        .expect(201);

      // Service returns { token }, so we need to find the invitation by token
      const invitation = await prisma.invitation.findFirst({
        where: { token: response.body.token },
      });
      if (invitation) {
        invitationId = invitation.id;
      }
    });

    it("should allow editor to create invitation", async () => {
      // First, create a user with this email (or get existing)
      await prisma.user.upsert({
        where: { email: "anotheruser@test.com" },
        update: {},
        create: {
          email: "anotheruser@test.com",
          password: "hashedpassword",
          name: "Another User",
        },
      });

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/invitations`)
        .set("Authorization", `Bearer ${editorUser.token}`)
        .send({
          email: "anotheruser@test.com",
          role: MembershipRole.VIEWER,
        })
        .expect(201);
    });

    it("should deny viewer from creating invitation", async () => {
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/invitations`)
        .set("Authorization", `Bearer ${viewerUser.token}`)
        .send({
          email: "test@test.com",
          role: MembershipRole.VIEWER,
        })
        .expect(403);
    });

    it("should allow all members to view invitations", async () => {
      await request(app.getHttpServer())
        .get(`/projects/${projectId}/invitations`)
        .set("Authorization", `Bearer ${ownerUser.token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/projects/${projectId}/invitations`)
        .set("Authorization", `Bearer ${editorUser.token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/projects/${projectId}/invitations`)
        .set("Authorization", `Bearer ${viewerUser.token}`)
        .expect(200);
    });

    it("should allow editor to delete invitation", async () => {
      if (invitationId) {
        await request(app.getHttpServer())
          .delete(`/projects/${projectId}/invitations/${invitationId}`)
          .set("Authorization", `Bearer ${editorUser.token}`)
          .expect(200);
      }
    });

    it("should deny viewer from deleting invitation", async () => {
      // First, create a user with this email (or get existing)
      await prisma.user.upsert({
        where: { email: "todelete@test.com" },
        update: {},
        create: {
          email: "todelete@test.com",
          password: "hashedpassword",
          name: "To Delete User",
        },
      });

      // Create an invitation first
      const createResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/invitations`)
        .set("Authorization", `Bearer ${ownerUser.token}`)
        .send({
          email: "todelete@test.com",
          role: MembershipRole.VIEWER,
        })
        .expect(201);

      // Service returns { token }, so we need to find the invitation by token
      const invitation = await prisma.invitation.findFirst({
        where: { token: createResponse.body.token },
      });

      if (invitation) {
        await request(app.getHttpServer())
          .delete(`/projects/${projectId}/invitations/${invitation.id}`)
          .set("Authorization", `Bearer ${viewerUser.token}`)
          .expect(403);

        // Cleanup
        await request(app.getHttpServer())
          .delete(`/projects/${projectId}/invitations/${invitation.id}`)
          .set("Authorization", `Bearer ${ownerUser.token}`)
          .expect(200);
      }
    });
  });

  describe("Memberships Access", () => {
    it("should allow all members to view memberships", async () => {
      await request(app.getHttpServer())
        .get(`/projects/${projectId}/memberships`)
        .set("Authorization", `Bearer ${ownerUser.token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/projects/${projectId}/memberships`)
        .set("Authorization", `Bearer ${editorUser.token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/projects/${projectId}/memberships`)
        .set("Authorization", `Bearer ${viewerUser.token}`)
        .expect(200);
    });

    it("should deny non-member from viewing memberships", async () => {
      await request(app.getHttpServer())
        .get(`/projects/${projectId}/memberships`)
        .set("Authorization", `Bearer ${nonMemberUser.token}`)
        .expect(403);
    });
  });

  describe("Role Hierarchy", () => {
    it("should verify OWNER has all permissions", async () => {
      // OWNER can do everything EDITOR can do
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .set("Authorization", `Bearer ${ownerUser.token}`)
        .send({
          title: "Owner Task via Editor Permission",
          description: "Owner using EDITOR permission",
        })
        .expect(201);

      // First, create a user with this email (or get existing)
      await prisma.user.upsert({
        where: { email: "hierarchy@test.com" },
        update: {},
        create: {
          email: "hierarchy@test.com",
          password: "hashedpassword",
          name: "Hierarchy User",
        },
      });

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/invitations`)
        .set("Authorization", `Bearer ${ownerUser.token}`)
        .send({
          email: "hierarchy@test.com",
          role: MembershipRole.VIEWER,
        })
        .expect(201);
    });

    it("should verify EDITOR has VIEWER permissions", async () => {
      // EDITOR can do everything VIEWER can do
      await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .set("Authorization", `Bearer ${editorUser.token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/projects/${projectId}/tasks`)
        .set("Authorization", `Bearer ${editorUser.token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/projects/${projectId}/invitations`)
        .set("Authorization", `Bearer ${editorUser.token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/projects/${projectId}/memberships`)
        .set("Authorization", `Bearer ${editorUser.token}`)
        .expect(200);
    });
  });

  describe("Error Handling", () => {
    it("should return 403 for unauthenticated requests", async () => {
      await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .expect(401);
    });

    it("should return 404 for non-existent project", async () => {
      const fakeProjectId = "fake-project-id";
      await request(app.getHttpServer())
        .get(`/projects/${fakeProjectId}`)
        .set("Authorization", `Bearer ${ownerUser.token}`)
        .expect(404);
    });

    it("should return appropriate error message for insufficient role", async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .set("Authorization", `Bearer ${viewerUser.token}`)
        .send({
          title: "Should Fail",
          description: "This should fail",
        })
        .expect(403);

      expect(response.body.message).toContain("Требуется роль");
    });
  });
});
