import React, { useState, useEffect } from 'react';
import { Team, TeamTypeCode, getTeamType } from '../../types/matchCentre';
import {
  createNationalFlagSvgDataUrl,
  getCountryFlag,
  getCountryFlagUrl,
} from '../../data/countryMetadata';

interface TeamEmblemProps {
  team?: Pick<
    Team,
    'name' | 'code' | 'country' | 'flag' | 'crestUrl' | 'primaryColor' | 'secondaryColor' | 'type' | 'team_type'
  > | null;
  crestUrl?: string;
  alt?: string;
  teamType?: TeamTypeCode;
  country?: string;
  flag?: string;
  code?: string;
  primaryColor?: string;
  secondaryColor?: string;
  className?: string;
}

export const TeamEmblem: React.FC<TeamEmblemProps> = ({
  team,
  crestUrl,
  alt,
  teamType,
  country,
  flag,
  code,
  primaryColor,
  secondaryColor,
  className = 'w-full h-full',
}) => {
  const resolvedType: TeamTypeCode = team
    ? getTeamType(team)
    : teamType || 'club';
  const resolvedCountry = country || team?.country || '';
  const resolvedFlag = flag || team?.flag || getCountryFlag(resolvedCountry);
  const resolvedCode = code || team?.code || 'INT';
  const primary = primaryColor || team?.primaryColor || '#0E2439';
  const secondary = secondaryColor || team?.secondaryColor || '#1E3A5F';

  const isClubLogoUrl = (url?: string) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes('transfermarkt') || lower.includes('tmssl.akamaized');
  };

  const initialSrc = (() => {
    const rawUrl = crestUrl ?? team?.crestUrl;
    if (resolvedType === 'country') {
      if (rawUrl && !isClubLogoUrl(rawUrl) && !rawUrl.startsWith('data:image/svg')) {
        return rawUrl;
      }
      return (
        getCountryFlagUrl(resolvedCountry, 160) ||
        createNationalFlagSvgDataUrl(resolvedCode, primary, secondary, resolvedFlag)
      );
    }
    return rawUrl || '';
  })();

  const [imgSrc, setImgSrc] = useState(initialSrc);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setImgSrc(initialSrc);
    setErrored(false);
  }, [initialSrc]);

  if (errored && resolvedType === 'country') {
    return (
      <span
        className="inline-flex items-center justify-center w-full h-full text-2xl leading-none select-none"
        role="img"
        aria-label={alt || `${resolvedCountry || team?.name || 'National'} flag`}
      >
        {resolvedFlag}
      </span>
    );
  }

  const sanitizedClassName = className
    .replace(/\bobject-(cover|fill|none|scale-down)\b/g, '')
    .trim();

  return (
    <img
      src={imgSrc}
      alt={alt || `${team?.name || resolvedCountry || 'Team'} ${resolvedType === 'country' ? 'flag' : 'crest'}`}
      referrerPolicy="no-referrer"
      onError={() => {
        if (resolvedType === 'country') {
          const svgFallback = createNationalFlagSvgDataUrl(
            resolvedCode,
            primary,
            secondary,
            resolvedFlag
          );
          if (imgSrc !== svgFallback) {
            setImgSrc(svgFallback);
            return;
          }
          setErrored(true);
        }
      }}
      className={`${sanitizedClassName} ${
        resolvedType === 'country'
          ? 'object-contain rounded-[4px] drop-shadow-sm'
          : 'object-contain drop-shadow-sm'
      }`}
    />
  );
};
