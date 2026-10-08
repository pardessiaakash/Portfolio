import React, { useState } from "react";
import Tooltip, { tooltipClasses } from "@mui/material/Tooltip";
import { styled } from "@mui/material/styles";
import {
  Box,
  Typography,
} from "@mui/material";

const StyledTooltip = styled(({ className, ...props }) => (
  <Tooltip
    {...props}
    arrow
    classes={{ popper: className }}
     PopperProps={{
      modifiers: [
        {
          name: "offset",
          options: {
            offset: [0, -12],
          },
        },
      ],
    }}
  />
))(() => ({
  [`& .${tooltipClasses.tooltip}`]: {
    background: "linear-gradient(135deg, #1a1d1a 0%, #0d0f0d 100%)",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "10px",
    padding: "6px 12px",
    maxWidth: "auto",
    boxShadow: "0 12px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.03)",
    position: "relative",
    overflow: "visible",
  },
  "& .MuiTooltip-arrow": {
    display: "none",
  },
}));

export default function CustomTooltip({
  title,
  children,
  placement = "top",
}) {
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <StyledTooltip
      open={open}
      arrow
      placement={placement}
      onOpen={handleOpen}
      onClose={handleClose}
      disableFocusListener
      disableTouchListener
      slotProps={{
        popper: {
          sx: {
            zIndex: 999999,
          },
        },
      }}
      title={
        <Box sx={{ position: "relative" }}>
          <Typography
            sx={{
              color: "rgba(255,255,255,0.9)",
              fontSize: "13px",
              lineHeight: 1.5,
              fontWeight: 500,
              letterSpacing: "0.02em",
            }}
          >
            {title}
          </Typography>
        </Box>
      }
    >
      <Box
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        sx={{ display: "inline-flex" }}
      >
        {children}
      </Box>
    </StyledTooltip>
  );
}