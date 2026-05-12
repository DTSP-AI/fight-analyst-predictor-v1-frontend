'use client';

/**
 * LegalGate — full-screen acceptance modal gating the entire app.
 *
 * Two required acknowledgments, both must be checked:
 *   1. Gambling Disclaimer / Terms of Use / Risk Acknowledgment
 *   2. Beta Confidentiality Agreement (NDA)
 *
 * Persists acceptance in localStorage under a versioned key so we can re-prompt
 * users when the legal text changes by bumping the version constant.
 *
 * NOT a substitute for an attorney-reviewed agreement. Boilerplate only.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ScrollText, AlertTriangle, CheckSquare, Square, Swords } from 'lucide-react';

// Bump when you materially change the legal text — re-prompts all users.
const LEGAL_VERSION = 'v1';
const ACCEPTANCE_KEY = `fightPredictor_legalAccepted_${LEGAL_VERSION}`;

export default function LegalGate() {
  const [hydrated, setHydrated] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptedGambling, setAcceptedGambling] = useState(false);
  const [acceptedNDA, setAcceptedNDA] = useState(false);

  // Hydrate from localStorage on mount. SSR-safe.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ACCEPTANCE_KEY);
      if (stored) {
        setAccepted(true);
      }
    } catch {
      // Private browsing or storage blocked — treat as not accepted.
    }
    setHydrated(true);
  }, []);

  const handleAccept = () => {
    if (!acceptedGambling || !acceptedNDA) return;
    try {
      window.localStorage.setItem(
        ACCEPTANCE_KEY,
        JSON.stringify({
          version: LEGAL_VERSION,
          accepted_at: new Date().toISOString(),
          gambling_acknowledged: true,
          nda_acknowledged: true,
        })
      );
    } catch {
      // Best effort — proceed even if storage failed.
    }
    setAccepted(true);
  };

  // Render nothing during hydration to avoid flash, and nothing after acceptance.
  if (!hydrated || accepted) return null;

  const bothChecked = acceptedGambling && acceptedNDA;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 5, 10, 0.92)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        <motion.div
          initial={{ scale: 0.96, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          style={{
            background:
              'linear-gradient(160deg, rgba(28, 28, 46, 0.98), rgba(18, 18, 32, 0.98))',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '720px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow:
              '0 30px 60px rgba(0, 0, 0, 0.65), 0 0 80px rgba(59, 130, 246, 0.18)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexShrink: 0,
              background:
                'linear-gradient(180deg, rgba(59, 130, 246, 0.06), rgba(59, 130, 246, 0))',
            }}
          >
            <div
              style={{
                background: 'var(--accent-gradient)',
                borderRadius: '10px',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Swords size={20} style={{ color: '#fff' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '0.2px',
                }}
              >
                Before You Continue
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  marginTop: '2px',
                }}
              >
                Read carefully. You must accept both agreements to use this product.
              </div>
            </div>
          </div>

          {/* Scrollable legal content */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 24px',
              fontSize: '13px',
              lineHeight: 1.65,
              color: 'var(--text-secondary)',
            }}
          >
            {/* ============================ GAMBLING DISCLAIMER ============================ */}
            <SectionHeader
              icon={<AlertTriangle size={16} />}
              title="1. Gambling Disclaimer, Risk Acknowledgment & Terms of Use"
              accent="#f59e0b"
            />

            <Body>
              <strong>The Fight Predictor (the &ldquo;Service&rdquo;) is an AI-driven
              analytical tool that produces opinion-based forecasts about combat-sports
              events using publicly available information. It is intended for
              entertainment, educational, and informational purposes only.</strong>
            </Body>

            <Body>
              <strong>Not gambling advice, financial advice, or professional handicapping.</strong>{' '}
              The Service is not a sportsbook, betting exchange, bookmaker, gambling
              operator, licensed advisor, registered investment adviser, or financial
              institution. We do not accept, place, broker, recommend, or facilitate
              wagers of any kind. Any output of the Service is one model&rsquo;s opinion,
              not a fact, prediction guarantee, or recommendation to wager money.
              Reliance on the Service for any wagering, betting, fantasy contest,
              or speculative decision is solely at your own risk.
            </Body>

            <Body>
              <strong>Age, jurisdiction, and legality.</strong> You represent and warrant
              that you are at least eighteen (18) years of age (or the age of majority
              in your jurisdiction of residence, whichever is greater), and that your
              use of the Service complies with all applicable federal, state, provincial,
              local, and tribal laws. Gambling, sports wagering, and certain forms of
              skill-game contests are illegal or restricted in many jurisdictions
              including without limitation parts of the United States, Canada, the
              United Kingdom, the European Union, Australia, and elsewhere. You are
              solely responsible for verifying the legality of any wagering activity
              in your jurisdiction. If wagering is illegal or restricted where you
              are located, you agree not to use the Service&rsquo;s outputs for any such
              activity.
            </Body>

            <Body>
              <strong>No guarantees of accuracy.</strong> Combat sports are inherently
              unpredictable. The Service uses AI models, statistical methods, and
              publicly scraped data that may be incomplete, outdated, biased, or
              wrong. Outputs may contain errors, hallucinations, omissions, or
              misclassifications. We make no representations, warranties, or
              guarantees of any kind, express or implied, about the accuracy,
              reliability, completeness, timeliness, or fitness for any particular
              purpose of any output. Past performance of the model, or of any fighter
              referenced, is not indicative of future results.
            </Body>

            <Body>
              <strong>Assumption of risk; no liability.</strong> To the maximum extent
              permitted by applicable law, you irrevocably and unconditionally
              acknowledge and agree that:
            </Body>
            <List>
              <li>
                You assume all risk arising from your use of the Service, including
                financial loss of any amount;
              </li>
              <li>
                The Service, its operators, contributors, affiliates, officers,
                directors, employees, agents, and licensors (collectively, the
                &ldquo;Released Parties&rdquo;) shall not be liable for any direct,
                indirect, incidental, special, consequential, exemplary, or punitive
                damages, including without limitation lost profits, lost wagers, lost
                bankroll, lost data, lost opportunities, emotional distress, or
                damages to reputation, whether based in contract, tort (including
                negligence), strict liability, statute, or any other legal theory,
                and whether or not the Released Parties were advised of the
                possibility of such damages;
              </li>
              <li>
                You release, waive, and forever discharge the Released Parties from
                any and all claims, demands, actions, causes of action, and damages
                of every kind and nature, whether known or unknown, foreseen or
                unforeseen, arising from or related to your use of the Service or
                any decision you make in reliance on its outputs;
              </li>
              <li>
                Where applicable law prohibits a complete waiver of liability, the
                Released Parties&rsquo; aggregate liability to you shall not exceed
                one hundred United States dollars ($100.00 USD) or the amount you
                have paid to access the Service in the preceding twelve (12) months,
                whichever is greater.
              </li>
            </List>

            <Body>
              <strong>Problem gambling resources.</strong> If you or someone you know
              has a gambling problem, help is available. In the United States, call
              the National Council on Problem Gambling at <strong>1-800-GAMBLER</strong>{' '}
              (1-800-426-2537) or visit{' '}
              <a
                href="https://www.ncpgambling.org/help-treatment/national-helpline-1-800-522-4700/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent-primary)' }}
              >
                ncpgambling.org
              </a>
              . In the United Kingdom, contact GamCare at <strong>0808 8020 133</strong>.
              In Canada, contact the Canadian Centre on Substance Use and Addiction.
              In Australia, contact Gambling Help Online at <strong>1800 858 858</strong>.
              Wagering is high-risk. Never wager more than you can afford to lose.
            </Body>

            <Body>
              <strong>No endorsement of wagering operators.</strong> The Service does
              not endorse, sponsor, or have any affiliation with any sportsbook,
              casino, daily-fantasy operator, prediction market, or gambling
              platform. Any third-party trademarks, logos, fighter names, event
              names, league names, broadcaster names, or other marks appearing in
              the Service&rsquo;s outputs are the property of their respective owners
              and are used solely for identification and commentary in accordance
              with applicable fair-use, nominative-use, and commentary doctrines.
              Their appearance does not imply endorsement, sponsorship, or
              affiliation.
            </Body>

            <Body>
              <strong>No fiduciary or advisory relationship.</strong> Nothing on the
              Service creates a fiduciary, advisory, agency, principal, partnership,
              joint venture, attorney-client, accountant-client, or other special
              relationship between you and the Released Parties. Outputs are
              non-personalized and not tailored to your financial situation, risk
              tolerance, or objectives. Consult a licensed professional before
              making any financial decision.
            </Body>

            <Body>
              <strong>Acceptable use.</strong> You agree not to (a) use the Service
              to facilitate, conduct, or promote illegal gambling, money laundering,
              fraud, or any other unlawful activity; (b) misrepresent outputs of the
              Service as professional handicapping, expert analysis, or insider
              information; (c) automate, scrape, or programmatically extract Service
              outputs without prior written authorization; (d) interfere with,
              disrupt, or impose unreasonable load on the Service or its
              infrastructure; or (e) use the Service to harass, defame, or harm any
              fighter, official, broadcaster, or other person referenced in
              outputs.
            </Body>

            <Body>
              <strong>Privacy &amp; data use.</strong> The Service may store the
              fighter names, fight URLs, prompts, outputs, and timestamps associated
              with your use to improve model quality, debug issues, and operate the
              product. Do not enter personal data, payment information, account
              credentials, or other sensitive information into the Service.
            </Body>

            <Body>
              <strong>Modifications, termination, governing law.</strong> We may
              modify, suspend, or discontinue the Service or these Terms at any
              time, with or without notice. Continued use after a material change
              constitutes acceptance. These Terms shall be governed by the laws of
              the State of Florida, United States, without regard to its conflict-
              of-laws principles. Any dispute shall be resolved exclusively in the
              state and federal courts located in Pinellas County, Florida, and you
              consent to the personal jurisdiction of such courts.
            </Body>

            <Body>
              <strong>Severability.</strong> If any provision of these Terms is held
              invalid or unenforceable, the remaining provisions shall remain in
              full force and effect.
            </Body>

            {/* ============================ NDA ============================ */}
            <SectionHeader
              icon={<ScrollText size={16} />}
              title="2. Beta Confidentiality Agreement (NDA)"
              accent="#3b82f6"
            />

            <Body>
              The Service is currently in private beta. Access is granted on a
              limited, revocable, confidential basis subject to this Beta
              Confidentiality Agreement (the &ldquo;NDA&rdquo;).
            </Body>

            <Body>
              <strong>Confidential Information</strong> means, collectively, all
              non-public information of the Service and its operators that you
              learn, observe, receive, or have access to in connection with your
              use of the Service, in any form (oral, written, screenshot, recording,
              or otherwise), including without limitation: (a) the existence,
              features, user interface, behavior, prompts, system instructions,
              tool invocations, debug logs, error messages, and outputs of the
              Service; (b) the underlying methodology, model architecture, prompt
              engineering, knowledge graph design, ranking algorithms, data
              sources, scraping techniques, and synthesis logic; (c) any bugs,
              defects, vulnerabilities, undocumented features, performance
              characteristics, or roadmap information; (d) any pricing, business
              terms, partnership discussions, or commercial plans communicated to
              you; and (e) any information marked or otherwise reasonably
              understood to be confidential.
            </Body>

            <Body>
              <strong>You agree that you will:</strong>
            </Body>
            <List>
              <li>
                Hold all Confidential Information in strict confidence and use at
                least the same degree of care to prevent disclosure as you would
                use to protect your own most sensitive trade secrets, but in no
                event less than reasonable care;
              </li>
              <li>
                Use Confidential Information solely for the purpose of evaluating
                or testing the Service as authorized by us, and not for any
                competitive, commercial, or other purpose;
              </li>
              <li>
                Not publish, post, screenshot, record, stream, broadcast, paste,
                transmit, or otherwise disclose any Confidential Information to any
                third party (including social media, blogs, podcasts, forums, group
                chats, news outlets, or AI systems) without our prior express
                written consent;
              </li>
              <li>
                Not reverse-engineer, decompile, disassemble, scrape, or otherwise
                attempt to derive the source code, prompts, model weights, system
                architecture, or trade secrets of the Service;
              </li>
              <li>
                Not use Confidential Information to develop, train, fine-tune,
                evaluate, or operate any competing product, model, or service;
              </li>
              <li>
                Not represent or distribute Service outputs as your own work,
                analysis, or property, or as the work of any other person or
                entity;
              </li>
              <li>
                Promptly notify us in writing if you learn of any actual or
                threatened unauthorized disclosure or misuse of Confidential
                Information.
              </li>
            </List>

            <Body>
              <strong>Permitted disclosures.</strong> The obligations above do not
              apply to information that you can demonstrate (a) was publicly known
              and generally available through no breach by you; (b) was lawfully
              known to you prior to receipt from us, without confidentiality
              obligation; (c) was lawfully obtained from a third party without
              breach of any duty of confidentiality; or (d) is required to be
              disclosed by a court order, subpoena, or applicable law, provided
              that you give us prompt prior written notice and reasonable
              opportunity to seek a protective order.
            </Body>

            <Body>
              <strong>Term.</strong> Your confidentiality obligations under this
              NDA shall remain in effect for a period of three (3) years from the
              date of your last access to the Service, except with respect to
              information that constitutes a trade secret under applicable law,
              for which the obligations shall remain in effect indefinitely so
              long as the information retains its trade-secret status.
            </Body>

            <Body>
              <strong>Equitable relief.</strong> You acknowledge that any breach of
              this NDA would cause irreparable harm for which monetary damages
              would be inadequate, and that we shall be entitled to seek
              injunctive and other equitable relief in addition to any other
              remedies available at law or in equity, without the necessity of
              posting bond.
            </Body>

            <Body>
              <strong>No license.</strong> Nothing in this NDA grants you any
              license or right, by implication, estoppel, or otherwise, in or to
              any Confidential Information or any intellectual property rights of
              the Service or its operators, except the limited right to use the
              Service as expressly authorized.
            </Body>

            <Body>
              <strong>Return or destruction.</strong> Upon our request or upon
              termination of your access, you will promptly cease all use of and
              destroy or return all Confidential Information in your possession or
              control, and, if requested, certify such destruction in writing.
            </Body>

            <Body style={{ fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '20px' }}>
              By checking both boxes below and clicking &ldquo;Accept &amp; Continue,&rdquo;
              you confirm that you have read and understood these agreements, that
              you are at least eighteen (18) years old (or the age of majority in
              your jurisdiction), and that you agree to be bound by them.
            </Body>
          </div>

          {/* Checkboxes + actions */}
          <div
            style={{
              padding: '16px 24px 20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              flexShrink: 0,
              background: 'rgba(0, 0, 0, 0.18)',
            }}
          >
            <Checkbox
              checked={acceptedGambling}
              onToggle={() => setAcceptedGambling((v) => !v)}
              label={
                <>
                  I have read and agree to the{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    Gambling Disclaimer, Risk Acknowledgment &amp; Terms of Use
                  </strong>{' '}
                  above, and I confirm I am at least 18 years of age.
                </>
              }
            />
            <Checkbox
              checked={acceptedNDA}
              onToggle={() => setAcceptedNDA((v) => !v)}
              label={
                <>
                  I have read and agree to the{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    Beta Confidentiality Agreement (NDA)
                  </strong>{' '}
                  above.
                </>
              }
            />

            <motion.button
              type="button"
              onClick={handleAccept}
              disabled={!bothChecked}
              whileHover={bothChecked ? { scale: 1.01 } : undefined}
              whileTap={bothChecked ? { scale: 0.99 } : undefined}
              style={{
                marginTop: '4px',
                padding: '14px 18px',
                background: bothChecked
                  ? 'var(--accent-gradient)'
                  : 'rgba(255, 255, 255, 0.05)',
                color: bothChecked ? '#fff' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: bothChecked ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: bothChecked ? 1 : 0.6,
                transition: 'background 0.2s, opacity 0.2s',
              }}
            >
              <Shield size={16} />
              {bothChecked
                ? 'Accept & Continue'
                : 'Check both boxes to continue'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function SectionHeader({
  icon,
  title,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  accent: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginTop: '20px',
        marginBottom: '14px',
        paddingBottom: '10px',
        borderBottom: `1px solid ${accent}33`,
      }}
    >
      <span style={{ color: accent, display: 'flex' }}>{icon}</span>
      <span
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
        }}
      >
        {title}
      </span>
    </div>
  );
}

function Body({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <p
      style={{
        margin: '0 0 12px 0',
        ...style,
      }}
    >
      {children}
    </p>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return (
    <ul
      style={{
        margin: '0 0 14px 0',
        paddingLeft: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      {children}
    </ul>
  );
}

function Checkbox({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '10px 12px',
        background: checked
          ? 'rgba(59, 130, 246, 0.08)'
          : 'rgba(255, 255, 255, 0.03)',
        border: `1px solid ${checked ? 'rgba(59, 130, 246, 0.35)' : 'var(--glass-border)'}`,
        borderRadius: '10px',
        cursor: 'pointer',
        textAlign: 'left',
        color: 'var(--text-secondary)',
        fontSize: '12px',
        lineHeight: 1.55,
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <span
        style={{
          color: checked ? 'var(--accent-primary)' : 'var(--text-muted)',
          flexShrink: 0,
          marginTop: '1px',
          display: 'flex',
        }}
      >
        {checked ? <CheckSquare size={18} /> : <Square size={18} />}
      </span>
      <span>{label}</span>
    </button>
  );
}
