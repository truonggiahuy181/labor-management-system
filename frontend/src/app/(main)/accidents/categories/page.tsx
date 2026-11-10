"use client";

import { useState } from "react";
import { Autocomplete, Stack, TextField, Typography } from "@mui/material";
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
  const catalogOptions: Array<{ value: CatalogKind; label: string }> = [
    {
      value: "injury-factors",
      label: translate("accidentCatalog.injuryFactors"),
    },
    { value: "injury-types", label: translate("accidentCatalog.injuryTypes") },
    { value: "occupations", label: translate("accidentCatalog.occupations") },
  ];

  if (user && user.roleId !== ROLE.ADMIN) {
    return (
      <Typography color="text.secondary">
        {translate("users.adminOnly")}
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      <Autocomplete
        size="small"
        options={catalogOptions}
        value={
          catalogOptions.find((option) => option.value === catalog) ?? null
        }
        getOptionLabel={(option) => option.label}
        isOptionEqualToValue={(option, value) => option.value === value.value}
        onChange={(_, option) => option && setCatalog(option.value)}
        sx={{ width: 340, maxWidth: "100%" }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={translate("accidentCatalog.category")}
          />
        )}
      />

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
