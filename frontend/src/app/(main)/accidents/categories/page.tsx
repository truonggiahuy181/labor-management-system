"use client";

import { useState } from "react";
import { MenuItem, Stack, TextField, Typography } from "@mui/material";
import InjuryFactorCatalog from "@/Components/CatalogManagement/InjuryFactorCatalog";
import InjuryTypeCatalog from "@/Components/CatalogManagement/InjuryTypeCatalog";
import OccupationCatalog from "@/Components/CatalogManagement/OccupationCatalog";
import useAuth from "@/Hooks/useAuth";
import useLocales from "@/Hooks/useLocales";
import { ROLE } from "@/constants/roles";

type CatalogKind = "injury-types" | "injury-factors" | "occupations";

export default function AccidentCategoriesPage() {
  const { user } = useAuth();
  const { translate } = useLocales();
  const [catalog, setCatalog] = useState<CatalogKind>("injury-types");

  if (user && user.roleId !== ROLE.ADMIN) {
    return (
      <Typography color="text.secondary">
        {translate("users.adminOnly")}
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      <TextField
        select
        size="small"
        value={catalog}
        onChange={(event) => setCatalog(event.target.value as CatalogKind)}
        label={translate("accidentCatalog.category")}
        sx={{ width: 340, maxWidth: "100%" }}
      >
        <MenuItem value="injury-factors">
          {translate("accidentCatalog.injuryFactors")}
        </MenuItem>
        <MenuItem value="injury-types">
          {translate("accidentCatalog.injuryTypes")}
        </MenuItem>
        <MenuItem value="occupations">
          {translate("accidentCatalog.occupations")}
        </MenuItem>
      </TextField>

      {catalog === "injury-types" ? (
        <InjuryTypeCatalog />
      ) : catalog === "injury-factors" ? (
        <InjuryFactorCatalog />
      ) : (
        <OccupationCatalog />
      )}
    </Stack>
  );
}
