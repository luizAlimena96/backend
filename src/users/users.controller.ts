import { Controller, Get, Put, Param, Body, Query, UseGuards, Request } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) { }

  @Get()
  async findAll(@Query("organizationId") organizationId?: string) {
    return this.usersService.findAll(organizationId);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() data: any) {
    return this.usersService.update(id, data);
  }

  @Put("profile")
  async updateProfile(@Request() req, @Body() data: { newPassword?: string; name?: string; email?: string }) {
    const userId = req.user.id;
    return this.usersService.updateProfile(userId, data);
  }
}

