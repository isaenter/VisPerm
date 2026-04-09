-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('RESOURCE', 'ROLE', 'FILTER', 'ADDON');

-- CreateEnum
CREATE TYPE "EdgeType" AS ENUM ('INHERITANCE', 'NARROWING', 'EXTENSION', 'DENY');

-- CreateTable
CREATE TABLE "vis_node" (
    "id" TEXT NOT NULL,
    "tenant_id" VARCHAR(50) NOT NULL,
    "env" VARCHAR(20) DEFAULT 'prod',
    "type" "NodeType" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(100),
    "positionX" INTEGER,
    "positionY" INTEGER,
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "topology_id" TEXT,

    CONSTRAINT "vis_node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vis_edge" (
    "id" TEXT NOT NULL,
    "tenant_id" VARCHAR(50) NOT NULL,
    "env" VARCHAR(20) DEFAULT 'prod',
    "source_node_id" TEXT NOT NULL,
    "target_node_id" TEXT NOT NULL,
    "type" "EdgeType" NOT NULL,
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vis_edge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_resource_meta" (
    "resourceCode" VARCHAR(100) NOT NULL,
    "tenant_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "fields" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "sys_role" (
    "id" TEXT NOT NULL,
    "tenant_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sys_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_user_role" (
    "id" TEXT NOT NULL,
    "tenant_id" VARCHAR(50) NOT NULL,
    "user_id" VARCHAR(100) NOT NULL,
    "role_id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sys_user_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vis_topology" (
    "id" TEXT NOT NULL,
    "tenant_id" VARCHAR(50) NOT NULL,
    "env" VARCHAR(20) DEFAULT 'prod',
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vis_topology_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vis_snapshot" (
    "id" TEXT NOT NULL,
    "tenant_id" VARCHAR(50) NOT NULL,
    "topology_id" VARCHAR(100) NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vis_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vis_audit_log" (
    "id" TEXT NOT NULL,
    "tenant_id" VARCHAR(50) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "resource" VARCHAR(100) NOT NULL,
    "resource_id" VARCHAR(100),
    "user_id" VARCHAR(100) NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vis_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vis_node_tenant_id_env_type_idx" ON "vis_node"("tenant_id", "env", "type");

-- CreateIndex
CREATE INDEX "vis_node_tenant_id_topology_id_idx" ON "vis_node"("tenant_id", "topology_id");

-- CreateIndex
CREATE UNIQUE INDEX "vis_node_tenant_id_env_code_key" ON "vis_node"("tenant_id", "env", "code");

-- CreateIndex
CREATE INDEX "vis_edge_tenant_id_type_idx" ON "vis_edge"("tenant_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "vis_edge_tenant_id_source_node_id_target_node_id_key" ON "vis_edge"("tenant_id", "source_node_id", "target_node_id");

-- CreateIndex
CREATE INDEX "sys_resource_meta_tenant_id_idx" ON "sys_resource_meta"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "sys_resource_meta_tenant_id_resourceCode_key" ON "sys_resource_meta"("tenant_id", "resourceCode");

-- CreateIndex
CREATE INDEX "sys_role_tenant_id_idx" ON "sys_role"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "sys_role_tenant_id_code_key" ON "sys_role"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "sys_user_role_tenant_id_user_id_idx" ON "sys_user_role"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "sys_user_role_tenant_id_role_id_idx" ON "sys_user_role"("tenant_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "sys_user_role_tenant_id_user_id_role_id_key" ON "sys_user_role"("tenant_id", "user_id", "role_id");

-- CreateIndex
CREATE INDEX "vis_topology_tenant_id_env_status_idx" ON "vis_topology"("tenant_id", "env", "status");

-- CreateIndex
CREATE UNIQUE INDEX "vis_topology_tenant_id_env_name_key" ON "vis_topology"("tenant_id", "env", "name");

-- CreateIndex
CREATE INDEX "vis_snapshot_tenant_id_topology_id_idx" ON "vis_snapshot"("tenant_id", "topology_id");

-- CreateIndex
CREATE UNIQUE INDEX "vis_snapshot_tenant_id_topology_id_version_key" ON "vis_snapshot"("tenant_id", "topology_id", "version");

-- CreateIndex
CREATE INDEX "vis_audit_log_tenant_id_created_at_idx" ON "vis_audit_log"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "vis_audit_log_tenant_id_action_idx" ON "vis_audit_log"("tenant_id", "action");

-- CreateIndex
CREATE INDEX "vis_audit_log_tenant_id_resource_idx" ON "vis_audit_log"("tenant_id", "resource");

-- AddForeignKey
ALTER TABLE "vis_node" ADD CONSTRAINT "vis_node_topology_id_fkey" FOREIGN KEY ("topology_id") REFERENCES "vis_topology"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vis_edge" ADD CONSTRAINT "vis_edge_source_node_id_fkey" FOREIGN KEY ("source_node_id") REFERENCES "vis_node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vis_edge" ADD CONSTRAINT "vis_edge_target_node_id_fkey" FOREIGN KEY ("target_node_id") REFERENCES "vis_node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_user_role" ADD CONSTRAINT "sys_user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "sys_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
