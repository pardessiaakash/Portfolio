import { Box, Button } from "@mui/material";
import CustomTooltip from "./CustomTooltip";

const buttonStyles = {
  px: "18px",
  py: "12px",
  borderRadius: "10px",
  border: "1px solid transparent",
  background: `linear-gradient(#1C1C1C, #3A3A3A) padding-box, linear-gradient(11deg, #00CD1F 0%, #8C8C8C 14%, #8C8C8C 87%, #00CD1F 100%) border-box;
  `,
  color: "#fff",
  fontSize: "13px",
  fontWeight: 500,
  textTransform: "none",
  minWidth: "fit-content",
  flexShrink: 0,
  boxShadow: "none",
  "& .MuiButton-startIcon": {
    marginRight: "10px",
    marginLeft: 0,
  },
  "&:hover": {
     background: `linear-gradient(#1C1C1C, #3A3A3A) padding-box, linear-gradient(11deg, #00CD1F 0%, #8C8C8C 14%, #8C8C8C 87%, #00CD1F 100%) border-box;
  `,
    boxShadow: "none",
  },
  "&:active": { boxShadow: "none" },
};

function DownloadResume({ sx }) {
  return (
    <CustomTooltip
      title={<>Click to Download</>}
      placement="top"
    >
      <Button
        component="a"
        href="/Round-1_Corrections.pdf"
        download
        variant="contained"
        startIcon={
          <Box
            component="img"
            src="/assets/icons/download-resume.svg"
            alt=""
            sx={{ width: 20, height: 20 }}
          />
        }
        sx={{ ...buttonStyles, ...sx }}
      >
        Download Resume
      </Button>
    </CustomTooltip>
  );
}

export default DownloadResume;
